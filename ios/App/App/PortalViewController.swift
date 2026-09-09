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

 Settled is the operative word, and getting there takes two observers.
 `webView.url` is WebKit's ACTIVE url: PageLoadState::activeURL returns the
 pending API request url first, then the provisional one, and only then the
 committed one - so a KVO on it fires the instant `load()` is asked for a page,
 long before the server has answered. Observing only that (as this file first
 did) bounced on every single launch, because the callback arrived carrying the
 url we had just requested. So the bounce now waits for `isLoading` to settle,
 which is iOS's equivalent of onPageFinished, and the url observer is kept for
 the same reason MainActivity keeps doUpdateVisitedHistory: Next.js signs out
 with a client-side pushState that never starts a document load.
 */
final class PortalViewController: CAPBridgeViewController {

    /// Set by LoginViewController when a web-only flow (signup, password reset)
    /// should open instead of the default start URL.
    var startPath: String?

    private var urlObservation: NSKeyValueObservation?
    private var loadingObservation: NSKeyValueObservation?
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

        // Two hooks, the same split MainActivity uses: a finished load is
        // onPageFinished (hard navigation), a url change while nothing is
        // loading is doUpdateVisitedHistory (Next.js's client-side sign-out).
        urlObservation = webView?.observe(\.url, options: [.new]) { [weak self] _, _ in
            self?.maybeBounce()
        }
        loadingObservation = webView?.observe(\.isLoading, options: [.new]) { [weak self] _, _ in
            self?.maybeBounce()
        }
    }

    override func viewDidLoad() {
        // super loads config.appStartServerURL (CAPBridgeViewController.swift:167-180),
        // which is server.url verbatim - the member dashboard.
        super.viewDidLoad()

        if let startPath, let url = URL(string: startPath, relativeTo: LoginViewController.origin) {
            webView?.load(URLRequest(url: url))
        }
    }

    private func maybeBounce() {
        // !isLoading is the gate: while a load is in flight `url` is the page we
        // ASKED for, not the one the server gave us, so judging a session by it
        // would convict on the request rather than the answer.
        guard !bounced,
              let webView,
              !webView.isLoading,
              let url = webView.url,
              url.host == LoginViewController.origin.host
        else { return }

        if let pending = startPath {
            // Heading to a web-only flow (signup, password reset). Capacitor's
            // default /portal/auth load races ours and, signed out, COMMITS -
            // steer it to the requested page instead of bouncing. Once the
            // target commits, the escort ends and the bounce rule resumes.
            if url.path.hasPrefix("/portal/auth"),
               let target = URL(string: pending, relativeTo: LoginViewController.origin) {
                webView.load(URLRequest(url: target))
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
        loadingObservation = nil

        let error = URLComponents(url: url, resolvingAgainstBaseURL: false)?
            .queryItems?.first { $0.name == "error" }?.value

        SceneDelegate.setRoot(LoginViewController(bouncedOut: true, authError: error))
    }
}
