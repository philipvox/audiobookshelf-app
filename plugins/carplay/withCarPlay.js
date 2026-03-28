/**
 * plugins/carplay/withCarPlay.js
 *
 * Expo config plugin for CarPlay support.
 *
 * Architecture:
 * - AppDelegate creates window + starts RN in didFinishLaunchingWithOptions (as normal)
 * - PhoneSceneDelegate re-attaches that window to the UIWindowScene
 * - CarPlaySceneDelegate handles CarPlay connection via CPTemplateApplicationSceneDelegate
 * - UIApplicationSceneManifest declares both scene roles
 *
 * This avoids Expo dev client conflicts because:
 * 1. Window + RN bridge are created in didFinishLaunchingWithOptions (dev launcher happy)
 * 2. PhoneSceneDelegate just re-attaches the existing window to the scene (no duplicate init)
 *
 * Source of truth: plugins/carplay/src/
 */

const {
  withEntitlementsPlist,
  withInfoPlist,
  withXcodeProject,
  withDangerousMod,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const IOS_APP_NAME = 'SecretLibrary';

/**
 * Step 1: Add CarPlay audio entitlement
 */
function withCarPlayEntitlements(config) {
  return withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.carplay-audio'] = true;
    return config;
  });
}

/**
 * Step 2: Copy scene delegate files to the iOS project directory
 */
function withCarPlayFiles(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const pluginDir = path.join(projectRoot, 'plugins', 'carplay', 'src');
      const iosDir = path.join(projectRoot, 'ios', IOS_APP_NAME);

      if (!fs.existsSync(iosDir)) {
        console.warn(`[withCarPlay] iOS directory not found: ${iosDir}`);
        return config;
      }

      for (const fileName of ['CarPlaySceneDelegate.swift', 'PhoneSceneDelegate.swift']) {
        const srcFile = path.join(pluginDir, fileName);
        const destFile = path.join(iosDir, fileName);
        if (fs.existsSync(srcFile)) {
          fs.copyFileSync(srcFile, destFile);
        } else {
          console.warn(`[withCarPlay] Source file not found: ${srcFile}`);
        }
      }

      return config;
    },
  ]);
}

/**
 * Step 3: Add scene delegate files to Xcode build sources + link CarPlay.framework
 */
function withCarPlayXcodeProject(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const {
      addBuildSourceFileToGroup,
      addFramework,
      getProjectName,
    } = require('@expo/config-plugins/build/ios/utils/Xcodeproj');

    const projectRoot = config.modRequest.projectRoot;
    const projectName = getProjectName(projectRoot);

    for (const file of ['CarPlaySceneDelegate.swift', 'PhoneSceneDelegate.swift']) {
      addBuildSourceFileToGroup({
        filepath: path.join(projectName, file),
        groupName: projectName,
        project,
      });
    }

    addFramework({
      project,
      projectName,
      framework: 'CarPlay.framework',
    });

    return config;
  });
}

/**
 * Step 4: Add UIApplicationSceneManifest to Info.plist
 *
 * Declares both phone window scene (PhoneSceneDelegate) and CarPlay scene
 * (CarPlaySceneDelegate). PhoneSceneDelegate just re-attaches the existing
 * window — no duplicate RN initialization.
 */
function withCarPlayInfoPlist(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default',
            UISceneDelegateClassName: 'PhoneSceneDelegate',
          },
        ],
        CPTemplateApplicationSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'CarPlay',
            UISceneDelegateClassName: 'CarPlaySceneDelegate',
          },
        ],
      },
    };
    return config;
  });
}

/**
 * Main plugin - composes all steps
 */
function withCarPlay(config) {
  config = withCarPlayEntitlements(config);
  config = withCarPlayFiles(config);
  config = withCarPlayXcodeProject(config);
  config = withCarPlayInfoPlist(config);
  return config;
}

module.exports = withCarPlay;
