# Secret Library — The Complete Guide

*Everything you need to know to go from "what is this?" to listening to audiobooks.*

---

## What Is This?

**Secret Library** is an audiobook player app for your phone. It connects to a server called **AudiobookShelf** where your audiobooks live. Think of it like Plex or Jellyfin, but specifically for audiobooks.

There are three pieces to the ecosystem:

| Piece | What It Does | Who Needs It |
|-------|-------------|--------------|
| **AudiobookShelf (ABS)** | Stores and serves your audiobooks | The person hosting the library |
| **Secret Library App** | Plays audiobooks on your phone | Everyone who wants to listen |
| **Audiobook Tagger** | Fixes book metadata (genres, covers, series info) | The person managing the library |

**If someone invited you to their library**, you only need the app. Skip ahead to [Download the App](#download-the-app).

**If you're setting up your own library**, start from the beginning.

---

## Part 1: Setting Up a Server (Library Owners Only)

If someone already gave you a server URL, username, and password — skip this entire section.

### What Is AudiobookShelf?

AudiobookShelf (ABS) is free, open-source software that turns a folder of audiobook files into a streaming library. It runs on a computer or server that stays on, and anyone with a login can stream books from it.

**Website:** [audiobookshelf.org](https://www.audiobookshelf.org/)

### What You Need

- A computer or server that can stay running (a Raspberry Pi, an old laptop, a VPS, a NAS — anything)
- Your audiobook files (M4B, MP3, M4A — any common audio format)
- A basic understanding of running software on a computer (or willingness to learn)

### Supported Server Types

| Setup | Difficulty | Cost | Notes |
|-------|-----------|------|-------|
| **Docker on a home PC** | Medium | Free | Most common. Needs port forwarding for remote access |
| **Synology/QNAP NAS** | Easy | NAS hardware | Native Docker support on most models |
| **Raspberry Pi** | Medium | ~$50-80 | Works but slower for large libraries |
| **Cloud VPS** (Hetzner, DigitalOcean, etc.) | Medium | $5-20/month | Accessible from anywhere, no port forwarding |
| **Unraid/TrueNAS** | Easy-Medium | Varies | Community plugins available |

### Quick Docker Setup

The fastest way to get ABS running:

```bash
docker run -d \
  --name audiobookshelf \
  -p 13378:80 \
  -v /path/to/audiobooks:/audiobooks \
  -v /path/to/config:/config \
  -v /path/to/metadata:/metadata \
  ghcr.io/advplyr/audiobookshelf:latest
```

Replace `/path/to/audiobooks` with wherever your audiobook files live.

Then open `http://your-server-ip:13378` in a browser. Create an admin account, point it at your audiobooks folder, and it will scan them automatically.

### Organizing Your Audiobooks

ABS works best when your files are organized like this:

```
Audiobooks/
├── Author Name/
│   └── Book Title/
│       ├── audiobook.m4b        (the audio file)
│       └── cover.jpg            (optional cover image)
├── Author Name/
│   └── Series Name/             (if the book is in a series)
│       ├── Book 1/
│       │   └── audiobook.m4b
│       └── Book 2/
│           └── audiobook.m4b
```

**Key rules:**
- One book per folder
- Folder name = book title
- Parent folder = author name
- If it's a series, add a series folder between author and book

### Making Your Server Accessible Remotely

If you want to listen outside your home network, you have two options:

1. **Port forwarding** — Forward port 13378 on your router to your server. Then use your public IP or a dynamic DNS domain.
2. **Reverse proxy** — Put Caddy, Nginx, or Traefik in front of ABS with a domain name and HTTPS. This is the recommended approach.
3. **Tailscale/ZeroTier** — VPN mesh that makes your server accessible from anywhere without opening ports. Easiest option.

### Creating User Accounts

In ABS:
1. Go to **Settings > Users**
2. Click **Add User**
3. Set username and password
4. Choose permissions (most users just need "User" role)
5. Share the server URL, username, and password with them

---

## Part 2: Cleaning Up Your Library (Library Owners)

Raw audiobook files often have messy metadata — wrong genres, missing covers, inconsistent author names, no series info. The **Audiobook Tagger** fixes all of this.

### What the Tagger Does

| Feature | What It Fixes |
|---------|--------------|
| **Clean Genres** | Standardizes genres ("Sci-Fi" becomes "Science Fiction") |
| **AI Tags** | Uses GPT to generate descriptive tags from book descriptions |
| **Fix Titles** | Removes junk from titles (series info, extra punctuation) |
| **Fix Series** | Detects and corrects series names and book numbers |
| **Fix Descriptions** | Cleans up promotional text, formatting issues |
| **Find Covers** | Searches Google, Audible, and other sources for high-quality cover art |
| **Generate DNA** | Creates mood/theme/pacing tags for smart recommendations |

### Download the Tagger

- **macOS:** [Download DMG](https://mysecretlibrary.com/downloads/audiobook-tagger-lite.dmg) (macOS 12+)
- **Windows:** Available as a standalone `.exe` (Windows 10+, 64-bit)

### First-Time Setup

1. Open the Tagger
2. Go to **Settings**
3. Enter your ABS connection details:
   - **Server URL** — Your ABS server address (e.g., `https://abs.yourdomain.com`)
   - **API Token** — Found in ABS: Settings > Users > click your name > copy API Token
   - **Library ID** — The ID of the library you want to manage (e.g., `lib_xxxxx`)
4. (Optional) Enter an **OpenAI API key** to enable AI-powered features
5. Click **Save Settings**

### The Typical Workflow

1. Click the **download icon** to pull your library from ABS
2. Click **Select All**
3. Open the **Enrich menu** (sparkle icon) > **Run All**
4. Wait for processing to complete (watch the progress bar)
5. Review changes in the metadata panel (check for red/yellow warnings)
6. Click the **upload icon** to push cleaned metadata back to ABS

That's it. Your library now has clean genres, proper series info, better covers, and rich discovery tags.

### Confidence Scores

After enrichment, each book gets a confidence score:
- **Green (85%+)** — High confidence, metadata is solid
- **Yellow (60-84%)** — Medium confidence, worth a quick review
- **Red (<60%)** — Low confidence, review manually

---

## Part 3: Download the App

### Get Secret Library

| Platform | How to Get It |
|----------|--------------|
| **iOS** | [Join TestFlight](https://testflight.apple.com/join/ah2XdVu6) — tap the link on your iPhone |
| **Android** | [Download APK](https://mysecretlibrary.com/downloads/secret-library.apk) — install directly |

**iOS note:** TestFlight is Apple's official beta testing platform. Tap the link, install TestFlight if you don't have it, then install Secret Library. It works like any normal app.

**Android note:** You may need to allow "Install from unknown sources" in your phone settings to install the APK. This is normal for apps distributed outside the Play Store.

### Connect to Your Server

When you first open Secret Library:

1. **Enter your server URL** — The address of the AudiobookShelf server
   - Examples: `https://abs.mydomain.com`, `http://192.168.1.100:13378`
   - The app will automatically check if it's a valid ABS server
   - A green checkmark means it found the server

2. **Enter your username** — The account someone created for you (or that you created)

3. **Enter your password**

4. Tap **Sign In**

**Troubleshooting connection:**
- Make sure to include `https://` or `http://` in the URL
- If you're on the same network as the server, use the local IP (e.g., `192.168.1.100:13378`)
- If you're remote, use the public domain or IP
- Try accessing the URL in your phone's browser first — if it doesn't load there, the app won't connect either

### If Your Server Uses SSO (Single Sign-On)

Some servers use external authentication (Google, Okta, etc.). If yours does:
1. Enter the server URL
2. A "Sign in with SSO" button will appear
3. Tap it — your browser will open
4. Log in with your SSO provider
5. You'll be redirected back to the app, logged in

---

## Part 4: Using the App

### The Four Tabs

| Tab | What's There |
|-----|-------------|
| **Home** | Your bookshelf — everything in your library displayed as book spines or covers |
| **Library** | "My Library" — books you've saved, plus filtering by series, authors, genres |
| **Discover** | Browse and discover books by mood, genre, collections, and more |
| **Profile** | Settings, downloads, stats, and sign out |

### Your First Listen

1. Browse books on the **Home** tab
2. Tap a book to see its details (cover, description, chapters, series info)
3. Tap **Play** — audio starts streaming from the server
4. A mini player appears at the bottom of every screen

**Tip:** If you have a slow connection, download the book first (tap the download icon on the book detail screen). Downloaded books play instantly with no buffering.

### The Player

Tap the mini player to open the full-screen player:

| Control | What It Does |
|---------|-------------|
| **Play/Pause** | Start or stop audio |
| **Skip Back** | Jump back (default 30 seconds, configurable) |
| **Skip Forward** | Jump forward (default 30 seconds, configurable) |
| **Chapters** | See all chapters, tap to jump |
| **Speed** | Adjust playback speed (0.5x to 3.0x) — remembered per book |
| **Sleep Timer** | Auto-stops after a set time (shake your phone to add 5 more minutes) |
| **Bookmarks** | Tap to save your spot, hold to see all bookmarks |

### Hidden Features (the good stuff)

The app has some interactions that aren't obvious but are worth knowing:

| Action | What Happens |
|--------|-------------|
| **Long-press the skull logo** | Opens Settings (the skull is in the top-left corner) |
| **Double-tap a book cover** | Adds/removes a gold star sticker |
| **Swipe left/right on book detail** | Browse other books in the same series |
| **Tap a book's menu > Save** | Adds it to "My Library" (your personal curated list) |
| **Tap the heart on a series page** | Saves the whole series to your library |
| **Tap a book's menu > spine icon** | Pick a community-designed spine image |

### Downloading for Offline Listening

1. Open any book's detail screen
2. Tap the **download icon**
3. The book downloads in the background
4. Downloaded books appear in **Profile > Downloads**
5. They play without any internet connection

**Tip for commuters:** Download a few books before you leave. The app works perfectly in airplane mode, tunnels, and dead zones.

### Progress Syncing

Your listening position syncs automatically with the server. This means:
- Start on your phone, continue on your tablet (or the ABS web player)
- If you reinstall the app, your progress is still there
- Multiple devices stay in sync

### CarPlay & Android Auto

The app works in your car:
- **CarPlay:** Connect your iPhone — Secret Library appears in the CarPlay app list
- **Android Auto:** Connect your phone — open Secret Library from the launcher

From the car interface you can browse your library, resume listening, skip chapters, and control playback — all without touching your phone.

---

## Part 5: Community Spines

**Website:** [spines.mysecretlibrary.com](https://spines.mysecretlibrary.com/)

Spines are the narrow side-view images of books — what you see on a real bookshelf. Secret Library displays books as spines on a virtual shelf, and the community spine library lets users contribute and vote on spine designs.

### How Spines Work in the App

- Books automatically get a generated spine based on their genre and metadata
- You can also pick a community-submitted spine: open a book's menu > tap the spine icon
- Spines make browsing feel like walking through a real library

### Contributing Spines

1. Go to [spines.mysecretlibrary.com](https://spines.mysecretlibrary.com/)
2. Click **Submit a Spine**
3. Upload your spine image (must be at least 400px tall, 40px wide, portrait orientation)
4. Search for the book it belongs to
5. Submit for review

### Voting

Browse existing spines and vote them up or down. The best spines rise to the top and are more likely to be featured in the app.

---

## Part 6: Settings Worth Knowing About

Access settings by **long-pressing the skull logo** in the top-left corner, or going to the Profile tab.

### Playback

| Setting | What It Does | Default |
|---------|-------------|---------|
| Skip Forward Duration | How far the skip button jumps | 30 seconds |
| Skip Backward Duration | How far the back button jumps | 30 seconds |
| Remember Speed Per Book | Each book keeps its own playback speed | On |
| Smart Rewind | Auto-backs up when you resume after a pause (longer pause = more rewind) | On |

### Sleep Timer

| Setting | What It Does |
|---------|-------------|
| Shake to Extend | Shake your phone to add 5 minutes when the timer is about to end |
| Fade Out | Gradually lowers volume instead of abruptly stopping |

### Downloads

| Setting | What It Does |
|---------|-------------|
| WiFi Only | Only download books when connected to WiFi |
| Auto-Download | Automatically download the next book in a series |

---

## Glossary

| Term | Meaning |
|------|---------|
| **ABS** | AudiobookShelf — the open-source server software |
| **API Token** | A long string that lets tools (like the Tagger) talk to your ABS server |
| **DNA Tags** | Rich metadata tags describing mood, pacing, themes (generated by the Tagger) |
| **M4B** | The most common audiobook file format (like MP4 but for books, supports chapters) |
| **Spine** | A narrow side-view image of a book, displayed on the virtual bookshelf |
| **TestFlight** | Apple's official beta app testing platform |
| **APK** | Android app installer file (for installing outside the Play Store) |
| **Self-hosted** | Software you run on your own hardware — your data stays with you |

---

## FAQ

### Do I need to set up my own server?
No. If someone gave you a server URL, username, and password, you just need the app. You don't need to set up anything.

### Is this free?
Yes. The app, the server software, the tagger, and the spine library are all free.

### Can I use this with the official AudiobookShelf app?
Yes. Secret Library connects to the same ABS server. You can use both apps interchangeably — your progress syncs between them.

### Does Secret Library see my data?
No. The app connects directly to YOUR server. No data passes through any third-party service. See the [Privacy Policy](https://mysecretlibrary.com/privacy.html).

### What audiobook formats are supported?
ABS supports: M4B, M4A, MP3, MP4, OGG, OGA, FLAC, WMA, AIFF, WEBM, WEBMA, OPUS, AAC. Essentially any audio format.

### My books have wrong genres/covers/series info
Use the [Audiobook Tagger](https://mysecretlibrary.com/tagger.html) to fix metadata in bulk. It can clean up an entire library in minutes.

### The app can't connect to my server
1. Verify the URL works in your phone's browser
2. Make sure you included `http://` or `https://`
3. If you're on a different network than the server, make sure the server is accessible remotely (port forwarding, reverse proxy, or VPN)
4. Try the IP address instead of a domain name

### Audio won't play
1. Check your phone's volume and silent switch
2. Try downloading the book and playing it offline
3. Force-close and reopen the app
4. Check if the book plays in the ABS web interface — if it doesn't work there either, the file may be corrupted

### How do I report a bug?
- In the app: go to Profile > Bug Report
- On the web: [mysecretlibrary.com/bugs.html](https://mysecretlibrary.com/bugs.html)

---

## Quick Start Cheat Sheet

**For listeners (the person someone invited):**
1. Download the app ([iOS](https://testflight.apple.com/join/ah2XdVu6) / [Android](https://mysecretlibrary.com/downloads/secret-library.apk))
2. Enter the server URL, username, and password you were given
3. Tap a book, tap Play

**For library owners (setting up everything):**
1. Install [AudiobookShelf](https://www.audiobookshelf.org/) on a server
2. Add your audiobooks (organized: `Author/Book/file.m4b`)
3. Download the [Tagger](https://mysecretlibrary.com/downloads/audiobook-tagger-lite.dmg) and clean your metadata
4. Create user accounts in ABS for your friends/family
5. Share the server URL + credentials
6. They download the app and connect

---

*Secret Library — Listen beautifully.*

*[mysecretlibrary.com](https://mysecretlibrary.com) | [Privacy Policy](https://mysecretlibrary.com/privacy.html) | [Report a Bug](https://mysecretlibrary.com/bugs.html)*
