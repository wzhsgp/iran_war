/**
 * Configuration & Constants
 */
const CONFIG = {
    // Map settings
    map: {
        center: [32.4279, 53.6880], // Center of Iran
        defaultZoom: 6,
        minZoom: 4,
        maxZoom: 17,
        tourInterval: 12000, // ms between auto-tour steps (slower)
        flyDuration: 3.5, // seconds for fly animation (slower)
        tileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    },

    // Feed settings
    feed: {
        refreshInterval: 60000, // 1 min
        maxItems: 50,
    },

    // Data refresh
    dataRefreshInterval: 120000, // 2 min
};

// Iran regions of interest for the conflict
const CONFLICT_REGIONS = [
    {
        id: 'tehran',
        name: 'Tehran',
        lat: 35.6892,
        lng: 51.3890,
        zoom: 11,
        severity: 'high',
        description: 'Capital city — government & military command centers'
    },
    {
        id: 'isfahan',
        name: 'Isfahan',
        lat: 32.6546,
        lng: 51.6680,
        zoom: 11,
        severity: 'high',
        description: 'Nuclear facility & major military installations'
    },
    {
        id: 'bushehr',
        name: 'Bushehr',
        lat: 28.9234,
        lng: 50.8203,
        zoom: 11,
        severity: 'high',
        description: 'Nuclear power plant — strategic target'
    },
    {
        id: 'bandar-abbas',
        name: 'Bandar Abbas',
        lat: 27.1865,
        lng: 56.2808,
        zoom: 11,
        severity: 'high',
        description: 'Strait of Hormuz — critical oil shipping lane'
    },
    {
        id: 'tabriz',
        name: 'Tabriz',
        lat: 38.0800,
        lng: 46.2919,
        zoom: 11,
        severity: 'medium',
        description: 'Northwestern frontline — border with Turkey & Azerbaijan'
    },
    {
        id: 'shiraz',
        name: 'Shiraz',
        lat: 29.5918,
        lng: 52.5837,
        zoom: 11,
        severity: 'medium',
        description: 'Southern military base & air defense systems'
    },
    {
        id: 'mashhad',
        name: 'Mashhad',
        lat: 36.2605,
        lng: 59.6168,
        zoom: 11,
        severity: 'medium',
        description: 'Eastern region — near Afghan border, refugee influx'
    },
    {
        id: 'ahvaz',
        name: 'Ahvaz',
        lat: 31.3183,
        lng: 48.6706,
        zoom: 11,
        severity: 'high',
        description: 'Khuzestan oil fields — major energy infrastructure'
    },
    {
        id: 'strait-hormuz',
        name: 'Strait of Hormuz',
        lat: 26.5667,
        lng: 56.2500,
        zoom: 10,
        severity: 'high',
        description: 'Critical chokepoint — 20% of global oil transit'
    },
    {
        id: 'natanz',
        name: 'Natanz',
        lat: 33.5114,
        lng: 51.7264,
        zoom: 12,
        severity: 'high',
        description: 'Underground uranium enrichment facility'
    },
    {
        id: 'parchin',
        name: 'Parchin',
        lat: 35.5228,
        lng: 51.7700,
        zoom: 12,
        severity: 'medium',
        description: 'Military complex — suspected weapons testing'
    },
    {
        id: 'chabahar',
        name: 'Chabahar',
        lat: 25.2919,
        lng: 60.6430,
        zoom: 11,
        severity: 'low',
        description: 'Southeastern port — strategic naval presence'
    }
];
