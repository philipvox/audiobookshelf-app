# Android Auto Implementation Audit

**Date:** 2026-01-06
**Version:** See `src/constants/version.ts`

## Executive Summary

The Android Auto implementation is **well-structured and compliant** with Google's Android Auto media app guidelines. The implementation uses the standard MediaBrowserService architecture with a JSON file bridge for syncing browse data from React Native to native Android.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Native                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  automotiveService.ts                                    │    │
│  │  - Central service for CarPlay + Android Auto           │    │
│  │  - getBrowseSections() → BrowseSection[]                │    │
│  │  - handleAndroidAutoCommand() → player actions          │    │
│  └───────────────────────────┬─────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  androidAutoBridge.ts                                    │    │
│  │  - Writes JSON to android_auto_browse.json              │    │
│  │  - Uses Expo FileSystem (documentDirectory)             │    │
│  └───────────────────────────┬─────────────────────────────┘    │
└──────────────────────────────│──────────────────────────────────┘
                               │
                               │ JSON File Bridge
                               │
┌──────────────────────────────│──────────────────────────────────┐
│                        Native Android                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  MediaPlaybackService.kt (MediaBrowserServiceCompat)    │    │
│  │  - onGetRoot() → ROOT_ID                                │    │
│  │  - onLoadChildren() → reads JSON, returns MediaItems    │    │
│  │  - MediaSessionCallback → broadcasts commands to RN     │    │
│  │  - FileObserver → watches JSON for changes              │    │
│  └───────────────────────────┬─────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  AndroidAutoModule.kt (ReactContextBaseJavaModule)      │    │
│  │  - Receives broadcasts from MediaPlaybackService        │    │
│  │  - Emits events to React Native via EventEmitter        │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Files Audited

| File | Purpose | Status |
|------|---------|--------|
| `android/app/src/main/AndroidManifest.xml` | Android Auto declaration | ✅ Compliant |
| `android/app/src/main/res/xml/automotive_app_desc.xml` | Media capability declaration | ✅ Compliant |
| `android/app/src/main/java/.../MediaPlaybackService.kt` | MediaBrowserService implementation | ✅ Well-implemented |
| `android/app/src/main/java/.../AndroidAutoModule.kt` | Native module for RN bridge | ✅ Functional |
| `android/app/src/main/java/.../AndroidAutoPackage.kt` | React package registration | ✅ Correct |
| `android/app/src/main/java/.../MainApplication.kt` | Package registration | ✅ AndroidAutoPackage added |
| `src/features/automotive/automotiveService.ts` | Unified automotive service | ✅ Comprehensive |
| `src/features/automotive/androidAutoBridge.ts` | JSON file bridge | ✅ Simple and effective |

## Compliance Checklist

### Required Components

| Requirement | Status | Notes |
|-------------|--------|-------|
| MediaBrowserService declared | ✅ | `.MediaPlaybackService` with `android.media.browse.MediaBrowserService` intent |
| automotive_app_desc.xml | ✅ | Contains `<uses name="media"/>` |
| Car app meta-data | ✅ | `com.google.android.gms.car.application` pointing to XML |
| MediaSession created | ✅ | Created in `onCreate()` with proper flags |
| Session token exposed | ✅ | `sessionToken = mediaSession?.sessionToken` |
| onGetRoot() implemented | ✅ | Returns `BrowserRoot(ROOT_ID, null)` |
| onLoadChildren() implemented | ✅ | Async via `result.detach()`, reads from JSON |
| Playback callbacks | ✅ | play, pause, skipNext, skipPrevious, fastForward, rewind, seekTo |

### Google Guidelines Compliance

| Guideline | Status | Notes |
|-----------|--------|-------|
| Browse tree max 4 levels | ✅ | Only 2 levels: root → items |
| Load within 2 seconds | ✅ | Uses cached JSON file, async with detach |
| No blocking operations | ✅ | Uses CoroutineScope for all IO |
| Supports offline content | ✅ | Downloads section available |
| Media controls work | ✅ | All standard controls implemented |
| Handles empty states | ✅ | Shows placeholder items when empty |

## Browse Tree Structure

```
ROOT_ID
├── CONTINUE_LISTENING_ID → "Continue Listening"
│   └── [Playable book items with progress]
│
└── DOWNLOADS_ID → "Downloads"
    └── [Playable downloaded book items]
```

**Note:** The `LIBRARY_ID` section exists in code but is not currently exposed in the root browse tree. This is intentional to keep the car UI simple.

## Data Flow

### Browse Data Sync

1. `libraryCache` updates (new books, progress changes)
2. `automotiveService.syncAndroidAutoBrowseData()` called
3. `androidAutoBridge.updateAndroidAutoBrowseData(sections)` writes JSON
4. `MediaPlaybackService.FileObserver` detects change
5. `notifyChildrenChanged()` triggers Android Auto refresh

### Command Flow (Android Auto → App)

1. User taps item or control in Android Auto
2. `MediaSessionCallback` method called in `MediaPlaybackService.kt`
3. `sendCommandToApp()` broadcasts intent
4. `AndroidAutoModule` BroadcastReceiver receives
5. Event emitted to React Native via `onAndroidAutoCommand`
6. `automotiveService.handleAndroidAutoCommand()` routes to player

## Strengths

1. **Clean Architecture** - Clear separation between RN and native
2. **Async Loading** - Uses `result.detach()` for non-blocking loads
3. **Reactive Updates** - FileObserver + notifyChildrenChanged for live updates
4. **Command Deduplication** - Prevents double playback in automotiveService
5. **Error Handling** - Proper try/catch throughout
6. **Logging** - Comprehensive logging for debugging

## Potential Improvements

See `Issues-Found.md` for detailed list.
