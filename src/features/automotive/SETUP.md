# CarPlay & Android Auto Setup Guide

This document explains how to enable CarPlay and Android Auto support for the Audiobookshelf app.

## Lock Screen Controls (Already Implemented)

Lock screen controls work out of the box using `expo-media-control`. The app already supports:

- ✅ Play/Pause from lock screen
- ✅ Skip forward/backward (30 seconds)
- ✅ Next/Previous chapter
- ✅ Seek scrubber
- ✅ Cover art, title, author display
- ✅ Headphone button controls
- ✅ Bluetooth controls
- ✅ Car steering wheel controls (for standard Bluetooth)

## CarPlay Setup (iOS)

### Prerequisites

1. **Apple Developer Program membership**
2. **CarPlay Audio App entitlement** - Must be requested from Apple

### Step 1: Request CarPlay Entitlement

1. Log in to [Apple Developer Portal](https://developer.apple.com)
2. Go to Account → Certificates, Identifiers & Profiles
3. Select your App ID
4. Request the CarPlay Audio entitlement
5. Wait for Apple approval (can take days/weeks)

### Step 2: Install Dependencies

```bash
npm install react-native-carplay
npx pod-install
```

### Step 3: Configure Entitlements

Add to `ios/audiobookshelf/audiobookshelf.entitlements`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.carplay-audio</key>
    <true/>
</dict>
</plist>
```

### Step 4: Configure Info.plist

Add to `ios/audiobookshelf/Info.plist`:

```xml
<key>UIApplicationSceneManifest</key>
<dict>
    <key>UIApplicationSupportsMultipleScenes</key>
    <true/>
    <key>UISceneConfigurations</key>
    <dict>
        <key>CPTemplateApplicationSceneSessionRoleApplication</key>
        <array>
            <dict>
                <key>UISceneClassName</key>
                <string>CPTemplateApplicationScene</string>
                <key>UISceneConfigurationName</key>
                <string>CarPlay</string>
                <key>UISceneDelegateClassName</key>
                <string>$(PRODUCT_MODULE_NAME).CarPlaySceneDelegate</string>
            </dict>
        </array>
    </dict>
</dict>
```

### Step 5: Create CarPlay Scene Delegate

Create `ios/audiobookshelf/CarPlaySceneDelegate.swift`:

```swift
import UIKit
import CarPlay
import RNCarPlay

class CarPlaySceneDelegate: UIResponder, CPTemplateApplicationSceneDelegate {
    var interfaceController: CPInterfaceController?

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController
    ) {
        self.interfaceController = interfaceController
        RNCarPlay.connect(with: interfaceController, window: templateApplicationScene.carWindow)
    }

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnect interfaceController: CPInterfaceController
    ) {
        RNCarPlay.disconnect()
        self.interfaceController = nil
    }
}
```

### Step 6: Enable in App Config

In your app initialization (e.g., `App.tsx`):

```typescript
import { automotiveService } from '@/features/automotive';

// Initialize with CarPlay enabled
automotiveService.init({
  enableCarPlay: true,
  appName: 'Audiobookshelf',
});
```

### Testing CarPlay

1. **Xcode Simulator**: Window → Devices and Simulators → CarPlay
2. **Real Device**: Connect to a CarPlay-compatible car or head unit

---

## Android Auto Setup

### Prerequisites

1. Google Play Developer account (for production)
2. Android Studio for development/testing

### Step 1: Configure AndroidManifest.xml

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
    <application>
        <!-- Media Browser Service for Android Auto -->
        <service
            android:name=".MediaPlaybackService"
            android:exported="true">
            <intent-filter>
                <action android:name="android.media.browse.MediaBrowserService"/>
            </intent-filter>
        </service>

        <!-- Android Auto declaration -->
        <meta-data
            android:name="com.google.android.gms.car.application"
            android:resource="@xml/automotive_app_desc"/>
    </application>
</manifest>
```

### Step 2: Create automotive_app_desc.xml

Create `android/app/src/main/res/xml/automotive_app_desc.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<automotiveApp>
    <uses name="media"/>
</automotiveApp>
```

### Step 3: Create MediaPlaybackService

Create `android/app/src/main/java/com/audiobookshelf/app/MediaPlaybackService.java`:

```java
package com.audiobookshelf.app;

import android.os.Bundle;
import android.support.v4.media.MediaBrowserCompat;
import android.support.v4.media.MediaBrowserServiceCompat;
import android.support.v4.media.session.MediaSessionCompat;

import java.util.ArrayList;
import java.util.List;

public class MediaPlaybackService extends MediaBrowserServiceCompat {
    private static final String ROOT_ID = "root";
    private static final String CONTINUE_LISTENING_ID = "continue_listening";
    private static final String DOWNLOADS_ID = "downloads";

    private MediaSessionCompat mediaSession;

    @Override
    public void onCreate() {
        super.onCreate();

        // Create media session
        mediaSession = new MediaSessionCompat(this, "AudiobookshelfService");
        setSessionToken(mediaSession.getSessionToken());

        // Set flags for media buttons
        mediaSession.setFlags(
            MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS |
            MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
        );
    }

    @Override
    public BrowserRoot onGetRoot(String clientPackageName, int clientUid, Bundle rootHints) {
        // Allow browsing
        return new BrowserRoot(ROOT_ID, null);
    }

    @Override
    public void onLoadChildren(String parentId, Result<List<MediaBrowserCompat.MediaItem>> result) {
        List<MediaBrowserCompat.MediaItem> items = new ArrayList<>();

        if (ROOT_ID.equals(parentId)) {
            // Root level - show categories
            items.add(createBrowsableItem(CONTINUE_LISTENING_ID, "Continue Listening"));
            items.add(createBrowsableItem(DOWNLOADS_ID, "Downloads"));
        } else if (CONTINUE_LISTENING_ID.equals(parentId)) {
            // Load continue listening items
            // This would be populated from React Native
        } else if (DOWNLOADS_ID.equals(parentId)) {
            // Load downloaded items
            // This would be populated from React Native
        }

        result.sendResult(items);
    }

    private MediaBrowserCompat.MediaItem createBrowsableItem(String id, String title) {
        MediaDescriptionCompat description = new MediaDescriptionCompat.Builder()
            .setMediaId(id)
            .setTitle(title)
            .build();
        return new MediaBrowserCompat.MediaItem(description, MediaBrowserCompat.MediaItem.FLAG_BROWSABLE);
    }
}
```

### Step 4: Enable in App Config

```typescript
import { automotiveService } from '@/features/automotive';

automotiveService.init({
  enableAndroidAuto: true,
  appName: 'Audiobookshelf',
});
```

### Testing Android Auto

1. **Desktop Head Unit (DHU)**:
   - Enable developer mode in Android Auto app on phone
   - Download and install DHU from Android Studio
   - Connect phone via USB or WiFi
   - Run DHU

2. **Real Car**: Connect phone to Android Auto compatible vehicle

---

## Troubleshooting

### CarPlay Issues

**App not appearing in CarPlay:**
- Verify CarPlay entitlement is approved and added
- Check Info.plist scene configuration
- Rebuild the app completely

**Controls not working:**
- Verify MPNowPlayingInfoCenter is being updated
- Check remote command handlers are registered

### Android Auto Issues

**App not appearing:**
- Verify automotive_app_desc.xml exists
- Check MediaBrowserService is declared in manifest
- Enable "Unknown sources" in Android Auto developer settings

**Browse tree empty:**
- Check onLoadChildren implementation
- Verify MediaItems are being created correctly

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        App Layer                             │
├─────────────────────────────────────────────────────────────┤
│  automotiveService.ts   ←→   useAutomotive.ts (React hook)  │
├─────────────────────────────────────────────────────────────┤
│                      Bridge Layer                            │
├─────────────────────────────────────────────────────────────┤
│  react-native-carplay  │  Native MediaBrowserService        │
├─────────────────────────────────────────────────────────────┤
│                      Native Layer                            │
├─────────────────────────────────────────────────────────────┤
│  CPTemplateApplicationScene (iOS)  │  MediaSession (Android) │
├─────────────────────────────────────────────────────────────┤
│              CarPlay / Android Auto System                   │
└─────────────────────────────────────────────────────────────┘
```

The key insight is that **lock screen controls already work** because:
- `expo-media-control` handles MPNowPlayingInfoCenter (iOS) and MediaSession (Android)
- These are the same systems that CarPlay and Android Auto use
- The Now Playing screen in CarPlay/Android Auto is automatic when audio is playing

CarPlay/Android Auto add **browsing capability**:
- Browse library from car screen
- Start playing directly from car UI
- Simplified, driver-safe interface
