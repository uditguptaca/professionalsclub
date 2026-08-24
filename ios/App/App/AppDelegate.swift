import UIKit
import Capacitor
import UserNotifications

/**
 Holds a tapped notification until a Capacitor bridge exists to receive it.

 On iOS the tap is delivered once, to whatever object is
 `UNUserNotificationCenter.current().delegate` at that moment, and Apple
 requires that delegate to be set before didFinishLaunchingWithOptions returns.
 Capacitor's NotificationRouter only takes that role inside CapacitorBridge.init
 (CapacitorBridge.swift:210-211), which runs in CAPBridgeViewController.loadView
 - so with a login screen in front, nothing is listening when the tap arrives
 and the payload is simply lost. Unlike Android there is no Intent left behind
 to re-read.

 So: claim the delegate slot early, keep the response, and hand it to the real
 router once PortalViewController builds the bridge. The bridge overwrites this
 delegate itself (handleApplicationNotifications defaults to YES,
 CAPInstanceDescriptor.m:42), so there is nothing to uninstall.

 The plugin's own buffering covers only the next step - `didReceive` fires
 notifyListeners with retainUntilConsumed (PushNotificationsHandler.swift:79),
 which parks the payload until JS adds a listener (CAPPlugin.m:82-95, replayed
 at CAPPlugin.m:42-56). That buffer never sees an event that no delegate
 received.
 */
final class PendingPush: NSObject, UNUserNotificationCenterDelegate {
    static let shared = PendingPush()

    private var response: UNNotificationResponse?

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        self.response = response
        completionHandler()
    }

    /// Replay into Capacitor's router, whose delegate method is public
    /// (NotificationRouter.swift:49-59), so the payload reaches
    /// pushNotificationActionPerformed by the normal route.
    func replay(into router: NotificationRouter) {
        guard let response else { return }
        self.response = nil
        router.userNotificationCenter(.current(), didReceive: response, withCompletionHandler: {})
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Must happen before this method returns, or a tap that launched the app
        // is delivered to nobody. See PendingPush.
        UNUserNotificationCenter.current().delegate = PendingPush.shared
        return true
    }

    // Capacitor posts neither of these itself - grep the iOS runtime and the
    // only hits for .capacitorDidRegisterForRemoteNotifications are the
    // declaration (CAPNotifications.swift:12) and the plugin's observers
    // (PushNotificationsPlugin.swift:39-47). Without these two methods the
    // registration event never fires and getDeliveredNotifications rejects
    // (PushNotificationsPlugin.swift:125-127).
    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications,
                                        object: deviceToken)
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications,
                                        object: error)
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
