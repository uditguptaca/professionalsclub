import UIKit
import WebKit
import Capacitor

/**
 The WebView shell. LoginViewController is the front door; this controller
 assumes a session exists and shows the portal.

 The iOS half of android/app/src/main/java/ca/professionalsclub/app/MainActivity.java,
 with the same one piece of native logic: the signed-out bounce. If the WebView
 ever COMMITS the web login page (/portal/auth committed = the proxy did not
 redirect = no valid session, see src/proxy.ts:50-57), the member has logged
 out, been suspended, or the session expired - so the web login must never be
 shown. We swap back to the native login instead. Ordinary signed-in visits
 never trigger this, because the proxy 307s /portal/auth to the dashboard and
 the WebView only commits the final URL of a redirect chain.

 Committed is the operative word. Capacitor does post
 `.capacitorDecidePolicyForNavigationAction` for any listener
 (WebViewDelegationHandler.swift:69), but that fires for PROPOSED navigations,
 so it would see /portal/auth on every signed-in launch too - the app start URL
 IS /portal/auth. KVO on `webView.url` fires on commit, which is the behaviour
 MainActivity gets from onPageFinished.
 */
final class PortalViewController: CAPBridgeViewController {

    /// Set by LoginViewController when a web-only flow (signup, password reset)
    /// should open instead of the default start URL.
    var startPath: String?

    private var urlObservation: NSKeyValueObservation?
    private var bounced = false

    /**
     Called once `bridge` and `webView` are set and before the first load
     (CAPBridgeViewController.swift:44-53 and :158-165). `loadView()` is final,
     so this is the earliest available hook - and the only one that runs after
     CapacitorBridge.init has registered the plugins.
     */
    override func capacitorDidLoad() {
        super.capacitorDidLoad()

        // Hand over any push tapped before a bridge existed. Capacitor's
        // NotificationRouter only becomes the UNUserNotificationCenter delegate
        // inside CapacitorBridge.init (CapacitorBridge.swift:210-211), and
        // registerPlugins() ran in that same init (CapacitorBridge.swift:218 ->
        // :381), so PushNotificationsPlugin.load() has already set the router's
        // pushNotificationHandler (PushNotificationsPlugin.swift:36).
        if let router = bridge?.notificationRouter {
            PendingPush.shared.replay(into: router)
        }

        urlObservation = webView?.observe(\.url, options: [.new]) { [weak self] _, _ in
            self?.maybeBounce()
        }
    }

    override func viewDidLoad() {
        // super loads config.appStartServerURL (CAPBridgeViewController.swift:167-180),
        // which is server.url verbatim - /portal/auth.
        super.viewDidLoad()

        if let startPath, let url = URL(string: startPath, relativeTo: LoginViewController.origin) {
            webView?.load(URLRequest(url: url))
        }
    }

    private func maybeBounce() {
        guard !bounced,
              let url = webView?.url,
              url.host == LoginViewController.origin.host
        else { return }

        if let pending = startPath {
            // Heading to a web-only flow (signup, password reset). Capacitor's
            // default /portal/auth load races ours and, signed out, COMMITS -
            // steer it to the requested page instead of bouncing. Once the
            // target commits, the escort ends and the bounce rule resumes.
            if url.path.hasPrefix("/portal/auth"),
               let target = URL(string: pending, relativeTo: LoginViewController.origin) {
                webView?.load(URLRequest(url: target))
                return
            }
            if url.path.hasPrefix(pending) {
                startPath = nil
            }
            return
        }

        guard url.path.hasPrefix("/portal/auth") else { return }

        // Exception: /portal/signup and /portal/forgot-password are deliberately
        // web pages a signed-out member reaches from the native login. Only the
        // login page itself bounces, and the path check above is what limits it.
        bounced = true
        urlObservation = nil

        let error = URLComponents(url: url, resolvingAgainstBaseURL: false)?
            .queryItems?.first { $0.name == "error" }?.value

        SceneDelegate.setRoot(LoginViewController(bouncedOut: true, authError: error))
    }
}
