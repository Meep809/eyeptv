# Retro Digital Cable Guide

A static, GitHub-Pages-friendly 2000s-style digital cable TV guide.

## Files

- `index.html` — the guide
- `style.css` — retro cable-box styling
- `app.js` — M3U/XMLTV parser, guide renderer, and HLS playback

## GitHub Pages

1. Create a GitHub repository.
2. Upload these three files.
3. Go to **Settings → Pages**.
4. Select **Deploy from a branch**.
5. Select `main` and `/ (root)`.
6. Open the Pages URL.

## Data sources

The default configuration points at public IPTV-org playlist/EPG endpoints:

- M3U: `https://iptv-org.github.io/iptv/index.m3u`
- XMLTV: `https://iptv-org.github.io/epg/guides/us.xml`

You can change both in **SETUP / DATA SOURCES**.

## Important browser limitation

GitHub Pages is only hosting the interface. It does not proxy IPTV streams.

A channel may appear in the guide but fail to play if its stream:
- blocks browser requests,
- does not provide CORS headers,
- requires authentication,
- is not browser-compatible HLS,
- or has gone offline.

The guide uses hls.js for browsers that do not natively support HLS.

## Making it your own

The intended next step is to customize:
- channel lineup and numbering
- 2000s cable-provider branding
- colors/theme
- local channels
- custom XMLTV entries
- a channel-surfing mode
- full-screen "cable box" UI
- Weather Channel / WeatherStar-style local insert channels

The app is intentionally static: no server, database, Node.js, PHP, or Python is required.
