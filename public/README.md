# Public Folder - Live TV & M3U8 Channels Guide

You can place your `.m3u8` playlist files, `.ts` video chunk files, or custom channel configurations directly in this `/public` directory.

## 1. Direct M3U8 Files
Place any `.m3u8` file in this folder (e.g., `espn.m3u8`, `stream1.m3u8`).
- The app will automatically detect and list it in the **Local & Public Streams** category under Live TV!
- It can be referenced anywhere as `/public/your-file.m3u8` or directly in the URL: `#/live-tv?stream=/public/your-file.m3u8`

## 2. Using `channels.json`
You can define custom names, logos, and categories for your channels in `public/channels.json`:

```json
[
  {
    "id": "my-channel-1",
    "name": "ESPN HD (Local)",
    "url": "/public/espn.m3u8",
    "cat": "sports",
    "icon": "fa-solid fa-football"
  },
  {
    "id": "my-channel-2",
    "name": "Sky Cinema (Local)",
    "url": "/public/sky_cinema.m3u8",
    "cat": "entertainment",
    "icon": "fa-solid fa-film"
  }
]
```

## 3. Using M3U Playlists
You can drop an IPTV / M3U playlist file here as `public/playlist.m3u` or `public/channels.m3u`. All `#EXTINF` entries will be automatically parsed and available in the Live TV guide!
