# Maestro Screenshot Automation

Automated screenshot capture for all app screens using [Maestro](https://maestro.mobile.dev/).

## Quick Start

### 1. Install Maestro

```bash
# macOS (Homebrew)
brew install maestro

# or via curl
curl -Ls "https://get.maestro.mobile.dev" | bash
```

### 2. Run the App

Start your app on a simulator/emulator:

```bash
# iOS Simulator
npx expo run:ios

# Android Emulator
JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
ANDROID_HOME=/opt/homebrew/share/android-commandlinetools \
npx expo run:android
```

### 3. Capture All Screenshots

```bash
# Run master flow (captures everything - 150+ screenshots)
JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
  maestro test .maestro/flows/99-master.yaml

# Or run individual sections
JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
  maestro test .maestro/flows/02-home.yaml
```

## Flow Structure

```
.maestro/
├── flows/                    # Modular capture flows
│   ├── 00-config.yaml       # Shared configuration
│   ├── 01-login.yaml        # Login screen states
│   ├── 02-home.yaml         # Home screen
│   ├── 03-library.yaml      # Library tabs
│   ├── 04-player.yaml       # CD Player & mini-player
│   ├── 05-browse.yaml       # Browse/Discover
│   ├── 06-profile.yaml      # Profile & Settings
│   ├── 07-detail-screens.yaml # Book, Series, Author, Narrator
│   ├── 08-search.yaml       # Search screen
│   ├── 09-queue.yaml        # Queue management
│   ├── 10-onboarding.yaml   # Preferences onboarding
│   ├── 11-empty-states.yaml # Empty state captures
│   └── 99-master.yaml       # Master orchestration
│
├── screenshots/              # Output directory
│   └── screens/             # Organized by section
│       ├── 01-login/
│       ├── 02-home/
│       ├── 03-library/
│       ├── 04-player/
│       ├── 05-browse/
│       ├── 06-profile/
│       ├── 07-details/
│       ├── 08-search/
│       ├── 09-queue/
│       ├── 10-onboarding/
│       └── 11-empty/
│
├── config.yaml              # Maestro configuration
└── README.md                # This file
```

## What Gets Captured

### 01 - Login (7 screenshots)
- Empty form
- URL focused
- Invalid URL error
- Filled form
- Connecting state
- Auth error

### 02 - Home (10 screenshots)
- Default state (top, scrolled, bottom)
- Pull to refresh
- With playback active
- Mini-player visible
- Pills (sleep, speed, queue)

### 03 - Library (17 screenshots)
- All tab (top, scrolled, bottom)
- Downloaded tab
- In Progress tab
- Not Started tab
- Completed tab
- Favorites tab
- Sort dropdown
- Search active
- Search with results
- Storage summary

### 04 - Player (20 screenshots)
- Mini-player (playing, paused)
- Full player (paused, playing)
- Progress bar
- Sleep timer sheet (open, scrolled, active)
- Speed sheet (open, scrolled, changed)
- Chapters list (top, scrolled, bottom)
- Skip actions
- Joystick seek
- Mini-player on different tabs

### 05 - Browse (23 screenshots)
- Default view (top, scrolled)
- Genre pills
- Genre filtered
- Mood discovery (card, steps 1-3, results)
- Genres list & detail
- Authors list
- Series list
- Narrators list
- Hero book detail

### 06 - Profile & Settings (31 screenshots)
- Profile main (top, scrolled, bottom)
- Downloads (content, swipe to delete)
- Wishlist (all tabs, manual add)
- Stats (top, scrolled, bottom)
- Reading History (filter sheet, sort sheet)
- Reading Preferences
- Playback Settings (pickers)
- Storage Settings
- Haptic Settings
- Chapter Cleaning Settings
- Joystick Seek Settings
- Sign out button

### 07 - Detail Screens (28 screenshots)
- Book Detail (overview, chapters, actions)
- Downloading state
- Series Detail (progress, books, sort, track)
- Author Detail (bio, books, follow)
- Narrator Detail (genres, collaborators, books)

### 08 - Search (14 screenshots)
- Empty with quick browse grid
- Category cards
- Input focused
- Typing (debounced)
- Results (top, scrolled, bottom)
- Result opened
- Cleared
- No results
- Recent searches

### 09 - Queue (6 screenshots)
- With items
- Now playing
- Swipe to delete
- Clear confirmation
- Empty queue

### 10 - Onboarding (14 screenshots)
- Preferences not set
- Step 1: Mood selection
- Step 2: Genre selection
- Step 3: Length preference
- Step 4: Series preference
- Preferences saved
- Mark Books wizard (card stack, swipes)

### 11 - Empty States (9 screenshots)
- Library tabs empty
- Downloads empty
- Wishlist empty
- Stats empty
- History empty
- Home no playback
- Queue empty

**Total: ~180+ screenshots**

## Tips

### Run on Specific Device

```bash
# List iOS simulators
xcrun simctl list devices

# Run on specific simulator
maestro test --device "iPhone 15 Pro" .maestro/flows/99-master.yaml
```

### Interactive Mode (Debug)

```bash
maestro studio
```

### View Screenshots During Capture

```bash
maestro test .maestro/flows/99-master.yaml --debug-output ./debug
```

## Troubleshooting

### "Element not found"
- The app may have different text in some versions
- Use `optional: true` in runFlow to skip if not found
- Check actual text in app using Maestro Studio

### Java Not Found
```bash
# Set JAVA_HOME before running
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
```

### Screenshots are black
- Wait for animations: `waitForAnimationToEnd` or `extendedWaitUntil`
- Increase timeouts for slow screens

### App not launching
- Ensure app is installed: `npx expo run:ios` or `npx expo run:android`
- Check bundle ID matches: `com.secretlibrary.app`
