/**
 * plugins/android-auto/withAndroidAuto.js
 *
 * Expo config plugin for Android Auto support.
 *
 * This plugin ensures Android Auto integration survives `npx expo prebuild --clean`
 * by performing these steps during prebuild:
 *
 * 1. Copies Kotlin source files (MediaBrowserService, Module, Package) to android/
 * 2. Copies automotive_app_desc.xml to android/res/xml/
 * 3. Adds Android Auto service + meta-data to AndroidManifest.xml
 * 4. Registers AndroidAutoPackage in MainApplication.kt
 *
 * Source of truth: plugins/android-auto/src/ and plugins/android-auto/res/
 */

const {
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const AUTOMOTIVE_PACKAGE = 'com.secretlibrary.app.automotive';
const AUTOMOTIVE_DIR = 'com/secretlibrary/app/automotive';

/**
 * Step 1: Modify AndroidManifest.xml to add Android Auto service and meta-data
 */
function withAndroidAutoManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application?.[0];
    if (!application) return config;

    // --- Add meta-data for Android Auto ---
    if (!application['meta-data']) {
      application['meta-data'] = [];
    }

    const hasCarMeta = application['meta-data'].some(
      (m) => m.$?.['android:name'] === 'com.google.android.gms.car.application'
    );

    if (!hasCarMeta) {
      application['meta-data'].push({
        $: {
          'android:name': 'com.google.android.gms.car.application',
          'android:resource': '@xml/automotive_app_desc',
        },
      });
    }

    // --- Add MediaBrowserService ---
    if (!application.service) {
      application.service = [];
    }

    const hasService = application.service.some(
      (s) => s.$?.['android:name'] === '.automotive.AndroidAutoMediaBrowserService'
    );

    if (!hasService) {
      application.service.push({
        $: {
          'android:name': '.automotive.AndroidAutoMediaBrowserService',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.media.browse.MediaBrowserService',
                },
              },
            ],
          },
        ],
      });
    }

    return config;
  });
}

/**
 * Step 2: Copy Kotlin source files and XML resource
 */
function withAndroidAutoFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const pluginDir = path.join(projectRoot, 'plugins', 'android-auto');
      const androidDir = path.join(projectRoot, 'android', 'app', 'src', 'main');

      // Copy Kotlin source files
      const kotlinDest = path.join(androidDir, 'java', AUTOMOTIVE_DIR);
      fs.mkdirSync(kotlinDest, { recursive: true });

      const kotlinFiles = [
        'AndroidAutoMediaBrowserService.kt',
        'AndroidAutoModule.kt',
        'AndroidAutoPackage.kt',
      ];

      for (const file of kotlinFiles) {
        const src = path.join(pluginDir, 'src', file);
        const dest = path.join(kotlinDest, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        }
      }

      // Copy automotive_app_desc.xml
      const xmlDest = path.join(androidDir, 'res', 'xml');
      fs.mkdirSync(xmlDest, { recursive: true });

      const xmlSrc = path.join(pluginDir, 'res', 'automotive_app_desc.xml');
      const xmlDestFile = path.join(xmlDest, 'automotive_app_desc.xml');
      if (fs.existsSync(xmlSrc)) {
        fs.copyFileSync(xmlSrc, xmlDestFile);
      }

      return config;
    },
  ]);
}

/**
 * Step 3: Register AndroidAutoPackage in MainApplication.kt
 */
function withAndroidAutoPackageRegistration(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const mainAppPath = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        'com',
        'secretlibrary',
        'app',
        'MainApplication.kt'
      );

      if (!fs.existsSync(mainAppPath)) return config;

      let content = fs.readFileSync(mainAppPath, 'utf8');

      // Add import if missing
      const importLine = `import ${AUTOMOTIVE_PACKAGE}.AndroidAutoPackage`;
      if (!content.includes(importLine)) {
        // Insert after the last existing import
        const lastImportIndex = content.lastIndexOf('import ');
        const endOfLastImport = content.indexOf('\n', lastImportIndex);
        content =
          content.slice(0, endOfLastImport + 1) +
          importLine +
          '\n' +
          content.slice(endOfLastImport + 1);
      }

      // Add package registration if missing
      if (!content.includes('AndroidAutoPackage()')) {
        // Find the packages.apply block and add our package
        content = content.replace(
          /PackageList\(this\)\.packages\.apply\s*\{([^}]*)\}/,
          (match, inner) => {
            // If it already has content, append; otherwise replace
            const trimmed = inner.trim();
            if (trimmed && !trimmed.startsWith('//')) {
              return `PackageList(this).packages.apply {\n              ${trimmed}\n              add(AndroidAutoPackage())\n            }`;
            }
            return `PackageList(this).packages.apply {\n              add(AndroidAutoPackage())\n            }`;
          }
        );
      }

      fs.writeFileSync(mainAppPath, content, 'utf8');
      return config;
    },
  ]);
}

/**
 * Main plugin - composes all steps
 */
function withAndroidAuto(config) {
  config = withAndroidAutoManifest(config);
  config = withAndroidAutoFiles(config);
  config = withAndroidAutoPackageRegistration(config);
  return config;
}

module.exports = withAndroidAuto;
