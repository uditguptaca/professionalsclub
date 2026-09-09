import UIKit
import WebKit
import UserNotifications

/**
 The native sign-in screen, and the scene's first root view controller. The
 WebView is never shown to a signed-out member, so the first thing the app
 presents is native UI rather than a web page loading.

 The iOS half of android/app/src/main/java/ca/professionalsclub/app/LoginActivity.java.
 Same contract, same endpoint, same session marker: it signs in by calling
 POST /api/auth/sign-in/email (the catch-all Neon Auth handler at
 src/app/api/auth/[...path]/route.ts) and plants the returned session cookies
 into the cookie store the WebView reads. PortalViewController then opens
 /portal/auth already authenticated and the site's proxy bounces it to the
 dashboard. Nothing about the server changes: one auth system, two front doors.

 Sign-up and password reset stay in the web flow - the signup wizard is a long
 multi-step form that would be madness to duplicate natively - so those links
 open the WebView at the right path, signed out.
 */
final class LoginViewController: UIViewController {

    /**
     Substring that marks a Neon Auth session cookie.

     The real name is `__Secure-neon-auth.session_token`
     (node_modules/@neondatabase/auth/dist/next/server/index.mjs:290 and :296).
     Matching the unprefixed substring keeps this identical to
     LoginActivity.SESSION_MARKER and survives the prefix changing.
     */
    private static let sessionMarker = "neon-auth.session_token"

    /// The warm cream the portal itself sits on (bg-secondary, #FFF7ED).
    static let brand = UIColor(red: 0xff / 255, green: 0xf7 / 255, blue: 0xed / 255, alpha: 1)
    static let ink = UIColor(red: 0x0c / 255, green: 0x0c / 255, blue: 0x0e / 255, alpha: 1)
    static let muted = UIColor(red: 0x78 / 255, green: 0x71 / 255, blue: 0x6c / 255, alpha: 1)

    /**
     The origin the shell points at, read from the same bundled config the
     WebView uses (the file CapacitorBridge.registerPlugins reads at
     CapacitorBridge.swift:308), so a `CAP_SERVER_URL` dev build and a store
     build both sign in against the right server without a second setting.

     server.url carries a path (`/portal/auth`), so only scheme/host/port are
     kept - the same trim LoginActivity.readOrigin does.
     */
    static let origin: URL = {
        let fallback = URL(string: "https://professionalsclub.vercel.app")!
        guard let file = Bundle.main.url(forResource: "capacitor.config", withExtension: "json"),
              let data = try? Data(contentsOf: file),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let server = json["server"] as? [String: Any],
              let raw = server["url"] as? String,
              var parts = URLComponents(string: raw)
        else { return fallback }
        parts.path = ""
        parts.query = nil
        parts.fragment = nil
        return parts.url ?? fallback
    }()

    /**
     Sign-in runs on its own ephemeral session so the response Set-Cookie
     headers land in a private in-memory jar instead of
     `HTTPCookieStorage.shared`. Nothing to clean up, and no chance of a stale
     shared-jar cookie outliving a sign-out.
     */
    private static let http: URLSession = {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 15
        return URLSession(configuration: configuration)
    }()

    /// Forwarded by PortalViewController when the WebView committed the web login.
    private let bouncedOut: Bool
    private let authError: String?

    private let emailField = UITextField()
    private let passwordField = UITextField()
    private let signInButton = UIButton(type: .system)
    private let errorLabel = UILabel()
    private let form = UIStackView()

    init(bouncedOut: Bool = false, authError: String? = nil) {
        self.bouncedOut = bouncedOut
        self.authError = authError
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) is not used") }

    // MARK: - Session

    /**
     Whether the WebView cookie jar already holds a session.

     `WKWebsiteDataStore.default()` is the store Capacitor's WKWebView uses -
     `webViewConfiguration(for:)` never assigns `websiteDataStore`
     (CAPBridgeViewController.swift:119-147), and Capacitor's own cookie
     plumbing reads and writes that exact store
     (CapacitorCookieManager.swift:104-135).
     */
    static func hasSession(_ completion: @escaping (Bool) -> Void) {
        WKWebsiteDataStore.default().httpCookieStore.getAllCookies { cookies in
            completion(cookies.contains { isSessionCookie($0) })
        }
    }

    private static func isSessionCookie(_ cookie: HTTPCookie) -> Bool {
        guard cookie.name.contains(sessionMarker), let host = origin.host else { return false }
        let domain = cookie.domain.hasPrefix(".") ? String(cookie.domain.dropFirst()) : cookie.domain
        return host == domain || host.hasSuffix("." + domain)
    }

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        buildForm()

        // A push tapped while this screen is up has nowhere to go: Capacitor's
        // NotificationRouter is only the UNUserNotificationCenter delegate while
        // a bridge exists (NotificationRouter.swift:9-16), and that delegate is
        // weak - so after a signed-out bounce tore the bridge down it is nil
        // again. Buffer here too; PortalViewController replays on sign-in.
        UNUserNotificationCenter.current().delegate = PendingPush.shared

        if bouncedOut {
            // Deliberately does NOT clear cookies - see the matching note in
            // LoginActivity.onCreate. A bounce is a heuristic that also fires
            // when the auth service simply could not be reached, and erasing
            // the jar over it threw away valid sessions and made members type
            // their password again. `bouncedOut` alone is what stops the
            // session check below from looping back into the WebView; a real
            // sign-out or expiry has already dropped the cookie server-side.
            reveal()
            return
        }

        // Already signed in: straight to the portal, no flash of the form.
        Self.hasSession { [weak self] signedIn in
            guard let self else { return }
            if signedIn {
                SceneDelegate.setRoot(PortalViewController())
            } else {
                self.reveal()
            }
        }
    }

    private func reveal() {
        form.isHidden = false
        // Mirror the web login's copy for a bounced suspension, so the member is
        // told why they are back here rather than silently looped.
        if authError == "account_inactive" {
            showError("This account is suspended. Contact an administrator for help.")
        }
        emailField.becomeFirstResponder()
    }

    // MARK: - Sign in

    @objc private func submit() {
        let email = (emailField.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let password = passwordField.text ?? ""
        guard !email.isEmpty, !password.isEmpty else {
            showError("Enter your email and password.")
            return
        }

        setBusy(true)
        signIn(email: email, password: password) { [weak self] error in
            guard let self else { return }
            if let error {
                self.setBusy(false)
                self.showError(error)
            } else {
                SceneDelegate.setRoot(PortalViewController())
            }
        }
    }

    /**
     The sign-in call. Calls back with nil on success (cookies planted), or a
     human-readable message to show inline.

     The 200 response carries the session as Set-Cookie headers. URLSession
     parses them into the ephemeral jar for us, which matters: the session
     cookies are HttpOnly, and `HTTPCookie(properties:)` has no key for
     HttpOnly - a hand-built cookie could never carry it. Letting Foundation
     parse the real header is the only way to get faithful HTTPCookie objects,
     and it preserves Secure/SameSite/expiry so the `__Secure-` name prefix
     stays valid when the cookie is planted.
     */
    private func signIn(email: String, password: String, completion: @escaping (String?) -> Void) {
        var request = URLRequest(url: Self.origin.appendingPathComponent("api/auth/sign-in/email"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        // The auth service validates the Origin header against its trusted
        // origins and rejects a missing one with INVALID_ORIGIN (verified
        // against production 2026-08-24). URLSession, unlike a browser, allows
        // setting it. If production ever rejects this request anyway, port the
        // Android fallback: run the fetch inside a hidden WKWebView on a stub
        // page carrying this origin, which reproduces the web form's request
        // exactly (LoginActivity.startAuthFetch is the reference).
        request.setValue(Self.origin.absoluteString, forHTTPHeaderField: "Origin")
        request.httpBody = try? JSONSerialization.data(
            withJSONObject: ["email": email, "password": password]
        )

        Self.http.dataTask(with: request) { data, response, _ in
            let finish: (String?) -> Void = { message in
                DispatchQueue.main.async { completion(message) }
            }

            guard let http = response as? HTTPURLResponse else {
                finish("Cannot reach the server. Check your connection and try again.")
                return
            }

            guard http.statusCode == 200 else {
                // 401 carries {"message": "..."} - show the server's own words.
                finish(Self.serverMessage(data) ?? "Sign-in failed. Please try again.")
                return
            }

            let jar = Self.http.configuration.httpCookieStorage
            let cookies = jar?.cookies ?? []
            jar?.removeCookies(since: .distantPast)

            Self.plant(cookies) {
                Self.hasSession { signedIn in
                    // The server said yes but the cookie did not stick - a
                    // WebView cookie-policy problem, not the member's fault.
                    finish(signedIn ? nil : "Signed in, but the session could not be saved. Please try again.")
                }
            }
        }.resume()
    }

    private static func serverMessage(_ data: Data?) -> String? {
        guard let data,
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let message = json["message"] as? String,
              !message.isEmpty
        else { return nil }
        return message
    }

    /**
     Copy freshly parsed cookies into the WebView store and call back once
     WebKit has acknowledged every one.

     Order is the whole point: this completes before PortalViewController is
     created, so the cookies are in place before the WKWebView exists, let alone
     before its first load. HttpOnly and `__Secure-` prefixed cookies go through
     `setCookie` unchanged - WKHTTPCookieStore stores whatever HTTPCookie it is
     handed, which is why Capacitor's own `getCookies()` has to filter
     `isHTTPOnly` back out (CapacitorCookieManager.swift:93).

     No mirroring into `HTTPCookieStorage.shared` is needed: Capacitor registers
     CapacitorWKCookieObserver on this same store
     (CAPBridgeViewController.swift:121) and it syncs that direction itself
     (CapacitorCookieManager.swift:5-13).
     */
    private static func plant(_ cookies: [HTTPCookie], completion: @escaping () -> Void) {
        DispatchQueue.main.async {
            let store = WKWebsiteDataStore.default().httpCookieStore
            // ponytail: warm the store before the first write. WebKit can drop
            // setCookie silently if the data store has never been touched in
            // this process, and no WKWebView has been created yet. Drop this
            // read if a cold-launch sign-in is ever proven to stick without it.
            store.getAllCookies { _ in
                let group = DispatchGroup()
                for cookie in cookies {
                    group.enter()
                    store.setCookie(cookie) { group.leave() }
                }
                group.notify(queue: .main, execute: completion)
            }
        }
    }

    // MARK: - Web flows

    @objc private func openSignUp() { openWeb("/portal/signup") }
    @objc private func openForgotPassword() { openWeb("/portal/forgot-password") }

    private func openWeb(_ path: String) {
        let portal = PortalViewController()
        portal.startPath = path
        SceneDelegate.setRoot(portal)
    }

    // MARK: - UI

    private func buildForm() {
        view.backgroundColor = Self.brand

        let title = UILabel()
        title.text = "Professionals Club"
        title.font = .systemFont(ofSize: 28, weight: .bold)
        title.textColor = Self.ink
        title.numberOfLines = 0

        let subtitle = UILabel()
        subtitle.text = "Sign in to your member portal."
        subtitle.font = .systemFont(ofSize: 15)
        subtitle.textColor = Self.muted
        subtitle.numberOfLines = 0

        style(emailField, placeholder: "Email", label: "Email address")
        emailField.keyboardType = .emailAddress
        emailField.textContentType = .username
        emailField.autocapitalizationType = .none
        emailField.autocorrectionType = .no
        emailField.returnKeyType = .next

        style(passwordField, placeholder: "Password", label: "Password")
        passwordField.isSecureTextEntry = true
        passwordField.textContentType = .password
        passwordField.returnKeyType = .done

        signInButton.setTitle("Sign in", for: .normal)
        signInButton.setTitleColor(.white, for: .normal)
        signInButton.titleLabel?.font = .systemFont(ofSize: 17, weight: .semibold)
        signInButton.backgroundColor = UIColor(red: 0xc2 / 255, green: 0x41 / 255, blue: 0x0c / 255, alpha: 1)
        signInButton.layer.cornerRadius = 10
        signInButton.heightAnchor.constraint(equalToConstant: 50).isActive = true
        signInButton.addTarget(self, action: #selector(submit), for: .touchUpInside)

        // Failures are surfaced inline and never clear what the member typed.
        errorLabel.font = .systemFont(ofSize: 14)
        errorLabel.textColor = UIColor(red: 0xb3 / 255, green: 0x26 / 255, blue: 0x1e / 255, alpha: 1)
        errorLabel.numberOfLines = 0
        errorLabel.isHidden = true

        let forgot = link("Forgot password?", #selector(openForgotPassword))
        let signUp = link("Create an account", #selector(openSignUp))

        form.axis = .vertical
        form.spacing = 14
        form.isHidden = true
        form.translatesAutoresizingMaskIntoConstraints = false
        [title, subtitle, emailField, passwordField, signInButton, errorLabel, forgot, signUp]
            .forEach(form.addArrangedSubview)
        form.setCustomSpacing(24, after: subtitle)
        form.setCustomSpacing(22, after: signInButton)
        view.addSubview(form)

        NSLayoutConstraint.activate([
            form.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            form.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 28),
            form.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -28)
        ])
    }

    private func style(_ field: UITextField, placeholder: String, label: String) {
        // The placeholder is decoration, not a label; give assistive tech a real one.
        field.accessibilityLabel = label
        field.backgroundColor = .white
        field.textColor = Self.ink
        field.borderStyle = .roundedRect
        field.delegate = self
        field.heightAnchor.constraint(equalToConstant: 48).isActive = true
        field.attributedPlaceholder = NSAttributedString(
            string: placeholder,
            attributes: [.foregroundColor: UIColor(red: 0xa8 / 255, green: 0xa2 / 255, blue: 0x9e / 255, alpha: 1)]
        )
    }

    private func link(_ text: String, _ action: Selector) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(text, for: .normal)
        button.setTitleColor(Self.muted, for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 15)
        button.contentHorizontalAlignment = .leading
        button.addTarget(self, action: action, for: .touchUpInside)
        return button
    }

    private func setBusy(_ busy: Bool) {
        signInButton.isEnabled = !busy
        signInButton.alpha = busy ? 0.6 : 1
        signInButton.setTitle(busy ? "Signing in\u{2026}" : "Sign in", for: .normal)
        if busy { errorLabel.isHidden = true }
    }

    private func showError(_ message: String) {
        errorLabel.text = message
        errorLabel.isHidden = false
        UIAccessibility.post(notification: .announcement, argument: message)
    }
}

extension LoginViewController: UITextFieldDelegate {
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        if textField == emailField {
            passwordField.becomeFirstResponder()
        } else {
            submit()
        }
        return false
    }
}
