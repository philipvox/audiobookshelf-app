import UIKit
import React

/**
 * PhoneSceneDelegate re-attaches AppDelegate's existing window to a UIWindowScene.
 *
 * React Native + Expo creates the window and starts RN in didFinishLaunchingWithOptions
 * (traditional lifecycle). When UIApplicationSceneManifest is present (required for
 * CarPlay), iOS switches to scene-based lifecycle and the window needs a windowScene.
 *
 * This delegate simply takes the already-initialized window from AppDelegate and
 * attaches it to the scene. No duplicate RN initialization, no dev client conflicts.
 */
@objc(PhoneSceneDelegate)
class PhoneSceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }

    // Re-attach AppDelegate's existing window to this scene
    if let existingWindow = appDelegate.window {
      existingWindow.windowScene = windowScene
      existingWindow.frame = windowScene.coordinateSpace.bounds
      self.window = existingWindow
      existingWindow.makeKeyAndVisible()
    } else {
      NSLog("[PhoneScene] WARNING: AppDelegate.window is nil")
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      RCTLinkingManager.application(
        UIApplication.shared,
        open: context.url,
        options: [:]
      )
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    RCTLinkingManager.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }
}
