# ProfileTab Documentation

## Overview

The ProfileTab serves as the settings hub for the app, accessible via the bottom navigation bar. It displays user account info, provides access to all app settings, and contains the logout functionality.

**Main screen:** `src/features/profile/screens/ProfileScreen.tsx`

---

## Settings Exposed

### User Header Section
- **Username** - Displays current logged-in user's username
- **User Type** - Shows account type (User, Admin, etc.)
- **Server URL** - Shows connected AudiobookShelf server
- **Quick Sign Out** - Red logout button in header corner

### My Stuff Section

| Setting | Navigation Target | Description |
|---------|-------------------|-------------|
| Downloads | `Downloads` screen | Manage downloaded audiobooks (count + storage size shown) |
| Listening Stats | `Stats` screen | View listening activity and history |

### Settings Section

| Setting | Type | Navigation/Action | Description |
|---------|------|-------------------|-------------|
| Playback | Link | `PlaybackSettings` | Speed, skip intervals, sleep timer, smart rewind |
| Storage | Link | `StorageSettings` | Downloads management, cache, WiFi-only mode |
| Chapter Names | Link | `ChapterCleaningSettings` | Clean up messy chapter names |
| Dark Mode | Toggle | In-place toggle | Switch between light/dark themes |
| Hide Single-Book Series | Toggle | In-place toggle | Hide series with only 1 book from browse |
| Kid Mode | Link | `KidModeSettings` | Content filtering for children (badge shows ON/OFF) |

### Recommendations Section

| Setting | Navigation Target | Description |
|---------|-------------------|-------------|
| Preferences | `Preferences` | Tune recommendation algorithm |
| Hidden Books | `HiddenItems` | Manage books hidden from recommendations (badge shows count) |

### Developer Section (DEV builds only)
| Setting | Navigation Target | Description |
|---------|-------------------|-------------|
| Stress Tests | `DebugStressTest` | Runtime monitoring & diagnostics |
| Export Performance Report | Action button | Export FPS, memory, errors as JSON to console |

---

## Sub-Screens Detail

### PlaybackSettings
**File:** `src/features/profile/screens/PlaybackSettingsScreen.tsx`

| Setting | Store | Default |
|---------|-------|---------|
| Default Speed | `playerStore.globalDefaultRate` | 1.0x |
| Skip Forward | `playerStore.skipForwardInterval` | 30s |
| Skip Back | `playerStore.skipBackInterval` | 15s |
| Shake to Extend (sleep) | `playerStore.shakeToExtendEnabled` | false |
| Smart Rewind | `playerStore.smartRewindEnabled` | true |
| Smart Rewind Max | `playerStore.smartRewindMaxSeconds` | 30s |
| Completion Prompt | `playerStore.showCompletionPrompt` | true |
| Auto-Mark Finished | `playerStore.autoMarkFinished` | false |

### StorageSettings
**File:** `src/features/profile/screens/StorageSettingsScreen.tsx`

| Setting | Store/Service | Default |
|---------|---------------|---------|
| Manage Downloads | Navigation to Downloads | - |
| WiFi Only | `networkMonitor.wifiOnlyEnabled` | false |
| Auto-Download Series | `networkMonitor.autoDownloadSeriesEnabled` | false |
| Refresh Library Cache | Action (refreshes cache) | - |
| Clear All Downloads | Destructive action | - |

### ChapterCleaningSettings
**File:** `src/features/profile/screens/ChapterCleaningSettingsScreen.tsx`

| Setting | Store | Default |
|---------|-------|---------|
| Cleaning Level | `chapterCleaningStore.level` | 'standard' |
| Show Original Names | `chapterCleaningStore.showOriginalNames` | false |

**Cleaning Levels:**
- `off` - Show chapter names exactly as stored
- `light` - Remove track numbers and file extensions
- `standard` (recommended) - Normalize chapter formatting
- `aggressive` - Remove book titles and fully standardize

### KidModeSettings
**File:** `src/features/profile/screens/KidModeSettingsScreen.tsx`

| Setting | Store | Default |
|---------|-------|---------|
| Enabled | `kidModeStore.enabled` | false |
| Use Age Filtering | `kidModeStore.useAgeFiltering` | true |
| Max Age Category | `kidModeStore.maxAgeCategory` | 'childrens' |
| Use Rating Filtering | `kidModeStore.useRatingFiltering` | true |
| Max Rating | `kidModeStore.maxRating` | 'g' |
| Use Allowed Genres/Tags | `kidModeStore.useAllowedGenresTags` | true |
| Allowed/Blocked Genres | Customizable lists | Defaults in store |
| Allowed/Blocked Tags | Customizable lists | Defaults in store |

### HiddenItems
**File:** `src/features/profile/screens/HiddenItemsScreen.tsx`

Displays books marked as "Not Interested" from recommendations. Users can:
- Tap a book to view its detail
- Tap restore button to unhide individual books
- Use "Clear All" to restore all hidden books

---

## Logout Flow

**Location:** `handleLogout` in `ProfileScreen.tsx:191-207`

### Steps:
1. **Confirmation** - Alert prompts "Are you sure you want to sign out?"
2. **Haptic Feedback** - Destructive confirm haptic on confirmation
3. **WebSocket Disconnect** - `appInitializer.disconnectWebSocket()`
4. **Server Logout** - `authService.logout()` (best-effort server notification)
5. **Clear API Token** - `apiClient.clearAuthToken()`
6. **Clear Storage** - `authService.clearStorage()` clears:
   - `auth_token` (SecureStore)
   - `server_url` (SecureStore)
   - `user_data` (AsyncStorage)
7. **State Reset** - Auth context sets `user: null, serverUrl: null`
8. **Navigation** - App automatically navigates to Login screen

### Auth Service Files:
- `src/core/auth/authService.ts` - Token/credential management
- `src/core/auth/authContext.tsx` - React context for auth state

---

## Cached Data That Persists After Logout

**IMPORTANT:** The following data persists after logout (stored in AsyncStorage):

### Settings Stores (persist across accounts)
| Store Name | AsyncStorage Key | Purpose |
|------------|------------------|---------|
| Theme | `theme-store` | Dark/light mode preference |
| Haptic Settings | `haptic-settings` | Haptic feedback preferences |
| Chapter Cleaning | `chapter-cleaning-settings` | Chapter name cleaning level |
| Kid Mode | `kid-mode-store` | Content filtering settings |
| Player Settings | `player-settings` | Playback preferences |
| Joystick Seek | `joystick-seek-settings` | Seek gesture settings |
| My Library | `my-library-store` | User's library (book IDs, favorites, preferences) |

### Content Stores (persist across accounts)
| Store Name | AsyncStorage Key | Purpose |
|------------|------------------|---------|
| Player Progress | `player-progress` | Per-book playback positions |
| Wishlist | `wishlist-store` | Wishlist items |
| Dismissed Items | `dismissed-items-store` | Hidden recommendations |
| Preferences | `preferences-store` | Recommendation preferences |
| Mood Session | `mood-session-store` | Discovery session state |
| Gallery | `gallery-store` | Reading history wizard state |

### What IS Cleared on Logout:
- Auth token (SecureStore: `auth_token`)
- Server URL (SecureStore: `server_url`)
- User data (AsyncStorage: `user_data`)
- WebSocket connection
- In-memory caches (library items, React Query cache)

### Implications:
- Switching accounts on same device retains preferences
- Downloaded files remain on device (not cleared on logout)
- Playback progress for previously-listened books persists
- Hidden books list persists between accounts

---

## Navigation Map

```
ProfileScreen
├── Downloads (Modal stack)
├── Stats (Modal stack)
├── PlaybackSettings (Modal stack)
├── StorageSettings (Modal stack)
├── ChapterCleaningSettings (Modal stack)
├── KidModeSettings (Modal stack)
├── Preferences (Modal stack)
├── HiddenItems (Modal stack)
└── [DEV] DebugStressTest (Modal stack)
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/features/profile/index.ts` | Public exports |
| `src/features/profile/screens/ProfileScreen.tsx` | Main profile hub |
| `src/features/profile/screens/PlaybackSettingsScreen.tsx` | Playback settings |
| `src/features/profile/screens/StorageSettingsScreen.tsx` | Storage settings |
| `src/features/profile/screens/ChapterCleaningSettingsScreen.tsx` | Chapter cleaning |
| `src/features/profile/screens/KidModeSettingsScreen.tsx` | Kid mode settings |
| `src/features/profile/screens/HiddenItemsScreen.tsx` | Hidden books |
| `src/features/profile/stores/hapticSettingsStore.ts` | Haptic prefs |
| `src/features/profile/stores/chapterCleaningStore.ts` | Chapter cleaning prefs |
| `src/features/profile/stores/kidModeStore.ts` | Kid mode config |
| `src/core/auth/authService.ts` | Auth operations |
| `src/core/auth/authContext.tsx` | Auth React context |
