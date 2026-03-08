/**
 * Map module — satellite map with markers only where news exists
 */
const ConflictMap = (() => {
    let map;
    let markers = [];
    let borderLayer = null;
    let tourIndex = 0;
    let tourTimer = null;
    let isTourActive = false;
    let activeRegionIds = new Set(); // regions that have actual news

    function init() {
        map = L.map('map', {
            center: CONFIG.map.center,
            zoom: CONFIG.map.defaultZoom,
            minZoom: CONFIG.map.minZoom,
            maxZoom: CONFIG.map.maxZoom,
            zoomControl: false,
            attributionControl: false,
        });

        // ESRI satellite tiles
        L.tileLayer(CONFIG.map.tileUrl, { maxZoom: 19 }).addTo(map);

        // Iran border outline
        drawIranBorder();

        // Load markers — only for regions with news
        loadMarkers();

        // Controls
        document.getElementById('btn-zoom-all').addEventListener('click', zoomToAll);
        document.getElementById('btn-auto-tour').addEventListener('click', toggleTour);

        // Auto-tour starts after 2s
        setTimeout(() => toggleTour(), 2000);

        // Fix sizing
        setTimeout(() => map.invalidateSize(), 300);
    }

    function drawIranBorder() {
        const pts = [
            [39.78,44.77],[39.38,44.79],[39.21,45.00],[38.87,44.89],
            [38.36,44.28],[38.08,44.47],[37.76,44.76],[37.36,44.56],
            [36.99,44.55],[36.82,44.82],[36.58,44.77],[35.82,44.55],
            [35.14,44.18],[34.95,44.38],[34.31,44.11],[33.63,44.19],
            [32.94,44.41],[32.33,44.98],[31.70,45.41],[31.39,45.38],
            [30.96,46.37],[30.44,46.55],[30.00,47.00],[29.95,47.57],
            [30.33,47.85],[30.06,48.01],[29.98,48.57],[29.55,48.55],
            [29.22,48.47],[28.97,48.84],[28.57,49.22],[28.20,49.43],
            [27.87,49.98],[27.65,50.48],[27.14,51.04],[27.05,51.47],
            [26.56,52.49],[26.33,53.39],[26.22,54.24],[25.91,55.07],
            [25.57,56.14],[25.40,57.08],[25.78,57.33],[26.26,57.12],
            [26.68,57.33],[26.99,57.05],[27.06,56.37],[27.42,56.45],
            [27.14,56.28],[27.19,56.19],[27.86,56.76],[28.27,57.04],
            [28.67,57.33],[29.18,57.29],[29.42,57.71],[29.90,57.80],
            [30.42,57.38],[30.90,56.98],[31.30,57.56],[31.68,58.38],
            [32.26,58.87],[32.76,59.22],[33.22,58.87],[33.56,58.95],
            [33.95,58.56],[34.22,58.88],[34.55,59.56],[34.89,59.96],
            [35.22,60.34],[35.65,60.48],[36.01,60.87],[36.29,61.12],
            [36.67,61.11],[36.89,60.68],[37.32,59.56],[37.56,59.08],
            [37.42,58.28],[37.11,57.42],[37.36,56.87],[37.69,56.37],
            [38.13,55.56],[38.28,54.87],[37.77,54.11],[37.54,53.88],
            [37.36,53.39],[37.23,53.14],[37.42,52.79],[37.59,52.22],
            [37.80,51.82],[38.18,51.12],[38.27,50.55],[38.42,49.98],
            [38.66,49.22],[38.85,48.85],[38.72,48.56],[38.86,48.20],
            [39.13,48.05],[39.35,47.96],[39.36,47.50],[39.20,47.19],
            [38.89,46.56],[39.11,46.22],[38.77,45.33],[38.95,44.86],
            [39.34,44.82],[39.56,44.68],[39.78,44.77]
        ];
        borderLayer = L.polyline(pts, {
            color: 'rgba(0, 230, 118, 0.35)',
            weight: 1.5,
            dashArray: '6, 4',
        }).addTo(map);
    }

    function loadMarkers() {
        // Clear old
        markers.forEach(m => map.removeLayer(m));
        markers = [];
        activeRegionIds.clear();

        const events = DataService.getConflictEvents();

        // Group events by regionId — only regions with at least 1 event get a marker
        const regionEvents = {};
        events.forEach(ev => {
            if (!regionEvents[ev.regionId]) regionEvents[ev.regionId] = [];
            regionEvents[ev.regionId].push(ev);
        });

        // For each region that has events, place ONE marker at the canonical region location
        Object.entries(regionEvents).forEach(([regionId, evts]) => {
            const region = CONFLICT_REGIONS.find(r => r.id === regionId);
            if (!region) return;

            activeRegionIds.add(regionId);

            // Pick worst severity from its events
            const hasSev = s => evts.some(e => e.severity === s);
            const severity = hasSev('high') ? 'high' : hasSev('medium') ? 'medium' : 'low';
            const count = evts.length;
            const latest = evts[0]; // already sorted newest first

            const color = { high: '#ff1744', medium: '#ffc400', low: '#00e676' }[severity];

            const icon = L.divIcon({
                className: 'conflict-marker',
                html: `
                    <div class="marker-pulse" style="background:${color}30;"></div>
                    <div class="conflict-marker-inner" style="background:${color};"></div>
                    <div class="marker-label">${region.name}</div>
                `,
                iconSize: [10, 10],
                iconAnchor: [5, 5],
            });

            const marker = L.marker([region.lat, region.lng], { icon })
                .addTo(map)
                .bindPopup(`
                    <div class="popup-content">
                        <h3>${region.name}</h3>
                        <p>${latest.title}</p>
                        <p style="margin-top:3px;font-size:9px;color:var(--text-2);">${latest.summary}</p>
                        <div class="popup-time">${latest.source} · ${DataService.formatRelativeTime(latest.time)} · ${count} report${count > 1 ? 's' : ''}</div>
                        <span class="popup-severity severity-${severity}">${severity}</span>
                    </div>
                `, {
                    className: 'conflict-popup',
                    maxWidth: 230,
                    closeButton: true,
                });

            markers.push(marker);
        });

        // Update header stats
        const mc = document.getElementById('marker-count');
        if (mc) mc.textContent = `${markers.length} MARKERS`;
        const ac = document.getElementById('article-count');
        if (ac) ac.textContent = `${events.length} FEEDS`;
    }

    function zoomToAll() {
        map.flyTo(CONFIG.map.center, CONFIG.map.defaultZoom, {
            duration: CONFIG.map.flyDuration
        });
        updateRegionLabel('IRAN — FULL THEATER OVERVIEW');
    }

    function flyToRegion(region) {
        map.flyTo([region.lat, region.lng], region.zoom, {
            duration: CONFIG.map.flyDuration
        });
        updateRegionLabel(region.name + ' — ' + region.description);
        updateMapTicker(region);
    }

    function toggleTour() {
        const btn = document.getElementById('btn-auto-tour');
        if (isTourActive) {
            clearInterval(tourTimer);
            isTourActive = false;
            btn.textContent = '▷';
            btn.classList.remove('active');
        } else {
            isTourActive = true;
            btn.textContent = '⏸';
            btn.classList.add('active');
            nextTourStep();
            tourTimer = setInterval(nextTourStep, CONFIG.map.tourInterval);
        }
    }

    function nextTourStep() {
        // Only tour regions that have actual news
        const hotRegions = CONFLICT_REGIONS.filter(r => activeRegionIds.has(r.id));
        if (hotRegions.length === 0) {
            // Fallback: tour high-severity defined regions
            const fallback = CONFLICT_REGIONS.filter(r => r.severity !== 'low');
            const region = fallback[tourIndex % fallback.length];
            flyToRegion(region);
        } else {
            const region = hotRegions[tourIndex % hotRegions.length];
            flyToRegion(region);
        }
        tourIndex++;
    }

    function updateRegionLabel(text) {
        const label = document.getElementById('region-label');
        label.textContent = text;
        label.classList.add('visible');
        clearTimeout(label._hideTimeout);
        label._hideTimeout = setTimeout(() => {
            label.classList.remove('visible');
        }, CONFIG.map.tourInterval - 1500);
    }

    function updateMapTicker(region) {
        const ticker = document.getElementById('map-news-ticker');
        const events = DataService.getRegionEvents(region.id);

        if (events.length === 0) {
            ticker.innerHTML = `<div class="ticker-item"><span class="ticker-source">${region.name}</span> — NO SIGINT</div>`;
            return;
        }

        // Show up to 2 latest headlines
        const items = events.slice(0, 2).map(e =>
            `<div class="ticker-item">
                <span class="ticker-source">${e.source}</span> ${e.title}
                <span style="color:var(--text-3);"> · ${DataService.formatRelativeTime(e.time)}</span>
            </div>`
        ).join('');
        ticker.innerHTML = items;
    }

    function refresh() {
        loadMarkers();
        map.invalidateSize();
    }

    function invalidateSize() {
        if (map) map.invalidateSize();
    }

    return { init, refresh, zoomToAll, flyToRegion, invalidateSize };
})();
