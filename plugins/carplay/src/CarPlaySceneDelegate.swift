import CarPlay
import UIKit

/**
 * CarPlaySceneDelegate handles the CarPlay scene lifecycle.
 *
 * Configured via Info.plist UIApplicationSceneManifest and instantiated
 * by the system when CarPlay connects/disconnects.
 *
 * Uses ObjC runtime to bridge to react-native-carplay's RNCarPlay module,
 * avoiding bridging header / CocoaPods header path issues.
 */
@objc(CarPlaySceneDelegate)
class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {

  // MARK: - CPTemplateApplicationSceneDelegate (iOS 14+)

  func templateApplicationScene(
    _ templateApplicationScene: CPTemplateApplicationScene,
    didConnect interfaceController: CPInterfaceController
  ) {
    let window = templateApplicationScene.carWindow

    // Dispatch to main thread to ensure RN bridge is ready
    DispatchQueue.main.async {
      guard let rnCarPlayClass = NSClassFromString("RNCarPlay") as? NSObject.Type else {
        NSLog("[CarPlay] RNCarPlay class not found - react-native-carplay may not be linked")
        return
      }

      let selector = NSSelectorFromString("connectWithInterfaceController:window:")
      if rnCarPlayClass.responds(to: selector) {
        rnCarPlayClass.perform(selector, with: interfaceController, with: window)
        NSLog("[CarPlay] Connected to CarPlay")
      } else {
        NSLog("[CarPlay] RNCarPlay does not respond to connectWithInterfaceController:window:")
      }
    }
  }

  func templateApplicationScene(
    _ templateApplicationScene: CPTemplateApplicationScene,
    didDisconnect interfaceController: CPInterfaceController
  ) {
    guard let rnCarPlayClass = NSClassFromString("RNCarPlay") as? NSObject.Type else {
      return
    }

    let selector = NSSelectorFromString("disconnect")
    if rnCarPlayClass.responds(to: selector) {
      rnCarPlayClass.perform(selector)
      NSLog("[CarPlay] Disconnected from CarPlay")
    }
  }
}
