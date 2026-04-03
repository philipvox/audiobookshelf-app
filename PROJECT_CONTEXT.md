# Project Context — Secret Library App

**Last updated:** 2026-04-03 (v0.9.282, build 1282)

> This is a living briefing document. Claude must revise it continuously during work — see CLAUDE.md for the rules. A Stop hook will remind you if source files are newer than this file.

---

## What This Is

A custom React Native/Expo audiobook player app ("Secret Library") for a self-hosted AudiobookShelf server (~2,700 books). Not a fork of the official ABS app. Distributed via TestFlight (iOS) and Google Play internal testing + sideloaded APK (Android).

## Current State

Feature-complete, in daily use. Development focused on polish, performance, platform compliance, and i18n.

### What's Working
- Full audiobook streaming + download playback
- ExoPlayer on Android (Media3 foreground service) / expo-av on iOS
- Android Auto and CarPlay integration
- Real-time WebSocket progress sync across devices
- Offline listening with deferred sync
- Community + generative spine image system
- Book DNA recommendations ("Because You Finished")
- Chromecast support
- i18n framework with 11 language files (en, de, es, fr, it, ja, ko, nl, pt, ru, zh)
- Per-book playback speed, sleep timer, bookmarks
- Full-screen CD player UI

### Recent Commits (latest first)
- `4250b24` — gitignore `.claude/` and `docs/superpowers/`
- `1103373` — i18n system, OIDC native auth, Android Auto fixes, player polish (71 files, 10.5K lines)
- `1bb276a` — logout hang fix, login pre-fill, error visibility

### Recent Focus Areas (last ~5 sessions)
1. **Repo cleanup + production readiness** — Committed all uncommitted work (71 files). Removed dev artifacts from git: `.maestro/` (150+ test flows/screenshots), `docs/` (audits, specs), root audit reports. Added comprehensive `.gitignore` entries. AI-generated translation disclaimer added to language settings.
2. **Splash screen + spine loading overhaul** — Real progress bar, descriptive status text, server-unreachable → login redirect, spine prefetch behind splash.
3. **Full-app code review + bug fixes** — 6 bugs fixed, BookmarksSheet + ChaptersSheet i18n completed.
4. **OIDC auth redesign** — Replaced WebView SSO with native HTTP plugin + system browser + PKCE.
5. **Android Auto stability** — Race conditions (TOCTOU fix), stale data, Google Play compliance.

### Known Issues / Tech Debt
- `package.json` version (0.9.261) is out of sync with `version.ts` (0.9.282)
- No CI/CD — builds are manual (fine for solo project)
- Full library scan over SSHFS takes ~9 hours — never trigger without explicit ask
- Non-English translations are AI-generated — disclaimer shown in language settings, should be reviewed by native speakers
- No `i18next.d.ts` type declaration — `t()` key typos fail silently at runtime
- OIDC native HTTP plugin needs iOS rebuild verification

---

## Key Architectural Decisions

1. **Expo config plugins for native code** — ExoPlayer (`plugins/exo-player/`), Android Auto (`plugins/android-auto/`), Native HTTP (`plugins/native-http/`), Chromecast, CarPlay. Source lives in `plugins/*/src/` (Kotlin) and `plugins/*/ios/` (Swift). Gets copied to `android/`/`ios/` by the plugin. After editing source, also copy to `android/`/`ios/` for builds without prebuild. For iOS, files must also be added to the Xcode project's compile sources (the config plugin does this during prebuild, but manual copies need manual Xcode project updates).

2. **Android Auto shares ExoPlayer's MediaSession** — no own player. `updatePlaybackState()` etc. in AndroidAutoModule are intentional no-ops.

3. **Seeking lock is critical** — `seekingStore.isSeeking` blocks position updates from audio engine. Without this, UI jitters during scrubs.

4. **Three-place favorites is intentional** — Books sync to server (SQLite), series/authors/narrators/genres are local-only (AsyncStorage).

5. **Community spine server is multi-instance** — matching uses ASIN/ISBN/hash, not ABS UUIDs.

6. **Upload keystore lost twice before** — at `android/upload.keystore`, backup at `~/Desktop/upload.keystore.backup`. Be careful with `expo prebuild --clean`.

---

## Build & Server Notes

See CLAUDE.md for the full pre-build checklist. Key: `expo prebuild` resets signing config, AndroidManifest needs `tools:node="remove"` entries, keystore must exist.

Server at `secretlibrary.org` (Oregon). Audio on 5TB Storage Box (Germany) via SSHFS. Three cache layers mask latency. Full server docs in `~/CLAUDE.md`. **Never trigger a full library scan unless explicitly asked.**

---

## Conventions

- Update `src/constants/version.ts` + `CHANGELOG.md` after changes
- Verify Metro bundling after import path changes (Jest mocks hide broken paths)
- `scale()` for responsive sizing, `minHeight: scale(44)` for touch targets
- Features don't import from other features — cross-feature code goes in `src/shared/`
- Keep this file updated continuously during work sessions
