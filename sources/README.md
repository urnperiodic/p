# 🎬 Urnperiodic Streaming - Sources & M3U8 Stream Guide

This folder contains all the separated configuration and stream source files, making it easy to manually edit, add, or replace movies, TV streams, `.m3u8` playlists, embed providers, and Live TV channels.

---

## 📁 File Directory

| File | Purpose | How to Edit |
| :--- | :--- | :--- |
| **`sources/movies.js`** | Custom Movies, TV Shows & M3U8 streams | Add custom `.m3u8` streams mapped by TMDB ID, IMDb ID, or custom movie titles. |
| **`sources/providers.js`** | TMDB Embed Providers & Anime Providers | Add or reorder iframe embed servers (Vidy, AutoEmbed, SuperEmbed, etc.). |
| **`sources/live_channels.js`**| Live TV Channels & Direct IPTV M3U8s | Add 24/7 Live M3U8 streams or custom sports/news/entertainment channels. |

---

## 🚀 How to Add or Edit a Movie with an M3U8 Stream

Open `sources/movies.js` and add an object to `window.CUSTOM_MOVIE_SOURCES`:

### 1. Adding a Movie by TMDB ID (e.g. Inception TMDB: 27205)
```javascript
{
  id: 27205, // TMDB ID for Inception
  title: "Inception",
  year: "2010",
  type: "movie",
  sources: [
    {
      name: "Direct 4K HLS Stream (M3U8)",
      quality: "4K UHD",
      url: "https://your-server.com/streams/inception.m3u8",
      type: "m3u8",
      isDefault: true
    },
    {
      name: "Backup 1080p Stream",
      quality: "1080p FHD",
      url: "https://your-server.com/streams/inception_1080p.m3u8",
      type: "m3u8"
    }
  ]
}
```

### 2. Adding a Standalone Custom Movie with Custom Metadata
```javascript
{
  id: "my-custom-movie",
  title: "My Custom Movie Title",
  year: "2024",
  type: "movie",
  rating: 8.5,
  poster: "https://example.com/poster.jpg",
  backdrop: "https://example.com/backdrop.jpg",
  overview: "Description of the movie here...",
  sources: [
    {
      name: "Primary HLS Master",
      quality: "1080p",
      url: "https://example.com/stream/master.m3u8",
      type: "m3u8"
    }
  ]
}
```

### 3. Adding TV Series Episodes with M3U8 Streams
```javascript
{
  id: 1399, // Game of Thrones
  title: "Game of Thrones",
  type: "tv",
  sources: {
    "1-1": [ // Season 1, Episode 1
      { name: "S01E01 1080p M3U8", url: "https://example.com/got_s01e01.m3u8", quality: "1080p", type: "m3u8" }
    ],
    "1-2": [ // Season 1, Episode 2
      { name: "S01E02 1080p M3U8", url: "https://example.com/got_s01e02.m3u8", quality: "1080p", type: "m3u8" }
    ]
  }
}
```

---

## ⚡ Player Features for M3U8 / HLS Playback

- **Adaptive Bitrate & Quality Selector**: Auto-detects multi-bitrate streams with manual quality switching (4K, 1080p, 720p, 480p, Auto).
- **CORS Bypass Proxy**: The built-in `/api/m3u8-proxy?url=...` endpoint handles cross-origin restrictions automatically.
- **On-the-fly M3U8 Input**: You can also click the **"🔗 Enter Custom M3U8"** button in the Watch server dropdown to test any `.m3u8` link immediately without reloading!
- **Resume Playback**: Remembers playback timestamps and resumes where you left off.
- **Keyboard Shortcuts**: `Space` (Play/Pause), `Left/Right` (Seek 10s), `F` (Fullscreen), `T` (Theater Mode), `M` (Mute).
