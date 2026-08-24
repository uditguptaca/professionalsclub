import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    /// The single connected scene. UIApplicationSupportsMultipleScenes is false
    /// (Info.plist), so there is only ever one.
    private static weak var current: SceneDelegate?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        SceneDelegate.current = self
        window = UIWindow(windowScene: windowScene)
        window?.backgroundColor = LoginViewController.brand
        // The native login is the front door. It decides in turn whether a
        // session already exists and swaps straight to PortalViewController.
        window?.rootViewController = LoginViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }

    /**
     Swap the window's root view controller.

     Assigning `rootViewController` is the whole mechanism: it releases the old
     controller, so swapping away from PortalViewController tears down the
     Capacitor bridge and its WKWebView, and swapping to a fresh one builds
     both again against whatever cookies are now in the store. That is exactly
     what the signed-out bounce needs, and it is why the cookies must be planted
     before the controller is created rather than after.
     */
    static func setRoot(_ viewController: UIViewController) {
        guard let window = current?.window else { return }
        window.rootViewController = viewController
    }
}
