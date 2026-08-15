# EyePTV v3

Static 2000s DCT-era-style IPTV guide for GitHub Pages.

## v3 fixes

The previous build initialized the demo lineup at startup. v3 keeps DEMO ONLY separate and actually parses the IPTV-org M3U when **LOAD IPTV LINEUP** is pressed.

It:
- parses `#EXTINF` channel metadata and stream URLs
- loads XMLTV separately
- reports the parsed channel count
- does not overwrite a successful IPTV load with demo channels
- uses a fixed cable-box overlay with preview, tuning banner, INFO, GUIDE, LAST and channel controls

Default sources:
- M3U: https://iptv-org.github.io/iptv/index.m3u
- EPG: https://iptv-org.github.io/epg/guides/us.xml

## GitHub Pages

Upload `index.html`, `style.css`, and `app.js` to the repository root and enable Pages from the `main` branch.

## Playback caveat

GitHub Pages only hosts the frontend. It does not proxy streams. Individual IPTV streams can still fail because of CORS, authentication, dead URLs, unsupported formats, or provider restrictions.
