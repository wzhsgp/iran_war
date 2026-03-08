# 🔴 Iran Conflict Tracker

A real-time Progressive Web App (PWA) tracking the Iran conflict with an interactive map and social media-style news feed.

![PWA](https://img.shields.io/badge/PWA-Ready-blue) ![GitHub Pages](https://img.shields.io/badge/Hosted-GitHub%20Pages-green)

## Features

- **🗺️ Live Conflict Map** — Leaflet-based dark-themed map of Iran with animated conflict markers, severity indicators, and auto-tour that zooms between hotspots
- **📱 Social News Feed** — Twitter/X-style card feed with breaking news, OSINT analysis, and eyewitness reports
- **🔄 Auto-Refresh** — Simulated live data updates every 2 minutes
- **📲 PWA / Installable** — Add to home screen on Samsung Galaxy or any mobile device
- **↕️ Split View** — Draggable divider between map and feed
- **🌙 Dark Theme** — OLED-friendly dark design

## Deploy to GitHub Pages

### Step 1: Create a GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Name it `iran-conflict-tracker` (or anything you like)
3. Set it to **Public**
4. Click **Create repository**

### Step 2: Push the Code

```bash
cd "path/to/Iran War"
git init
git add .
git commit -m "Initial commit: Iran Conflict Tracker PWA"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/iran-conflict-tracker.git
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Under **Source**, select **Deploy from a branch**
3. Select **main** branch and **/ (root)** folder
4. Click **Save**
5. Wait 1-2 minutes, then visit: `https://YOUR_USERNAME.github.io/iran-conflict-tracker/`

### Step 4: Install on Samsung Galaxy

1. Open Chrome on your Samsung Galaxy
2. Navigate to `https://YOUR_USERNAME.github.io/iran-conflict-tracker/`
3. Tap the **⋮** menu → **"Add to Home screen"** (or you'll see an install banner)
4. The app will appear on your home screen as a standalone app!

## Project Structure

```
├── index.html          # Main HTML shell
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (offline support)
├── css/
│   └── style.css       # All styles (dark theme, responsive)
├── js/
│   ├── config.js       # Configuration & conflict regions
│   ├── data.js         # Simulated data service
│   ├── map.js          # Leaflet map module
│   ├── feed.js         # News feed module
│   └── app.js          # Main app controller
├── icons/
│   └── icon-192.svg    # App icon
└── README.md
```

## Adding Real Data Sources

The app currently uses simulated data. To connect real sources, edit `js/data.js`:

### Option A: RSS Feeds (Free, no API key)
```javascript
// Use a CORS proxy + RSS-to-JSON service
const RSS_FEEDS = [
    'https://api.rss2json.com/v1/api.json?rss_url=https://www.aljazeera.com/xml/rss/all.xml',
    'https://api.rss2json.com/v1/api.json?rss_url=https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',
];
```

### Option B: NewsAPI.org (Free tier, requires API key)
```javascript
const NEWS_API_KEY = 'your_key_here';
const url = `https://newsapi.org/v2/everything?q=iran+war&apiKey=${NEWS_API_KEY}`;
```

### Option C: GDELT Project (Free, real-time global events)
```javascript
const GDELT_URL = 'https://api.gdeltproject.org/api/v2/doc/doc?query=iran+war&mode=artlist&format=json';
```

## Tech Stack

- **Leaflet.js** — Interactive maps
- **Vanilla JS** — No framework dependencies
- **CSS3** — Animations, gradients, backdrop-filter
- **PWA** — Service Worker + Web App Manifest
- **GitHub Pages** — Free static hosting

## License

MIT — Use freely, modify as needed.
