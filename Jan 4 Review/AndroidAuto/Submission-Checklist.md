# Android Auto Submission Checklist

**Date:** 2026-01-06
**App Name:** Secret Library (com.secretlibrary.app)

## Pre-Submission Requirements

### 1. App Configuration

| Requirement | Status | Location |
|-------------|--------|----------|
| `android.media.browse.MediaBrowserService` declared | ✅ | AndroidManifest.xml:49-56 |
| `com.google.android.gms.car.application` meta-data | ✅ | AndroidManifest.xml:31-33 |
| `automotive_app_desc.xml` with `<uses name="media"/>` | ✅ | res/xml/automotive_app_desc.xml |
| `android.hardware.type.automotive` feature (required=false) | ✅ | AndroidManifest.xml:15 |
| `FOREGROUND_SERVICE_MEDIA_PLAYBACK` permission | ✅ | AndroidManifest.xml:4 |

### 2. Technical Implementation

| Requirement | Status | Notes |
|-------------|--------|-------|
| MediaBrowserServiceCompat implementation | ✅ | MediaPlaybackService.kt |
| onGetRoot() returns valid root | ✅ | Returns ROOT_ID |
| onLoadChildren() provides browse content | ✅ | Async with JSON cache |
| MediaSession created and active | ✅ | In onCreate() |
| Session token exposed | ✅ | sessionToken = mediaSession?.sessionToken |
| Playback controls respond | ✅ | MediaSessionCallback implemented |

### 3. User Experience

| Requirement | Status | Notes |
|-------------|--------|-------|
| Browse tree loads quickly (< 2s) | ✅ | Uses cached JSON |
| Browse tree max 4 levels deep | ✅ | Only 2 levels |
| Meaningful content titles | ✅ | Book titles and authors |
| Cover art provided | ✅ | Via imageUrl |
| Empty states handled | ✅ | Placeholder messages |
| Offline content available | ✅ | Downloads section |

### 4. Testing

| Requirement | Status | Notes |
|-------------|--------|-------|
| Tested with Desktop Head Unit | ⬜ Pending | |
| Tested in actual car | ⬜ Pending | |
| No crashes during browse | ⬜ Pending | |
| No crashes during playback | ⬜ Pending | |
| Controls work while driving | ⬜ Pending | |

---

## Google Play Console Steps

### 1. Enable Android Auto in Console

1. Go to **Google Play Console** > Your App
2. Navigate to **Setup** > **Advanced settings** > **Android Auto**
3. Enable Android Auto distribution

### 2. Declare Form Factor

1. Go to **Release** > **Setup** > **Device compatibility**
2. Ensure Android Auto compatibility is enabled
3. Mark as "Audio" app type

### 3. Content Rating

1. Review content rating questionnaire
2. Ensure appropriate for driving (no visual content required)

### 4. App Review Process

Google reviews Android Auto apps for:

- [ ] **Driver distraction** - Minimal interaction required
- [ ] **Content loading** - Fast, under 2 seconds
- [ ] **Offline support** - Works without network
- [ ] **Stability** - No crashes
- [ ] **Standard UI** - Uses MediaBrowserService properly

---

## Submission Materials

### Screenshots Required

1. **Browse Tree** - Main categories visible
2. **Now Playing** - Playback screen with controls
3. **Content List** - Books listed in a category

### Description Updates

Add to Play Store description:
```
Android Auto Support:
- Browse your audiobook library from your car
- Continue listening where you left off
- Access downloaded books offline
- Standard media controls for hands-free operation
```

### Release Notes

```
New in this version:
- Android Auto support for in-car audiobook playback
- Browse Continue Listening and Downloads from your car
- Play, pause, skip chapters, and seek from car controls
```

---

## Final Verification

Before submitting:

- [ ] Build release APK/AAB
- [ ] Test with DHU one more time
- [ ] Verify browse tree loads in < 2 seconds
- [ ] Verify all playback controls work
- [ ] Verify no crashes during normal use
- [ ] Update Play Store listing
- [ ] Update screenshots if needed

---

## References

- [Android Auto Quality Guidelines](https://developer.android.com/docs/quality-guidelines/car-app-quality)
- [MediaBrowserService Documentation](https://developer.android.com/guide/topics/media/implementing-a-mediabrowserservice)
- [Building Media Apps for Cars](https://developer.android.com/training/cars/media)
- [Desktop Head Unit Guide](https://developer.android.com/training/cars/testing/dhu)
