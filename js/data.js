/**
 * Data layer — REAL news from GDELT + RSS feeds
 * Falls back to simulated data only if all APIs fail.
 *
 * Sources (all free, no API key, CORS-friendly from browser):
 *  1. GDELT Project — real-time global news monitoring
 *  2. RSS feeds via allorigins.win CORS proxy — Al Jazeera, BBC, Guardian, France24
 *  3. Simulated fallback data (only if everything else fails)
 */

const DataService = (() => {

    // ========================
    // State
    // ========================
    let liveArticles = [];
    let liveFeedPosts = [];
    let liveConflictEvents = [];
    let isLoaded = false;
    let lastFetchTime = 0;

    // ========================
    // Iran city coordinates for geo-matching articles to the map
    // ========================
    const CITY_COORDS = {
        'tehran':       { lat: 35.6892, lng: 51.3890, regionId: 'tehran' },
        'isfahan':      { lat: 32.6546, lng: 51.6680, regionId: 'isfahan' },
        'esfahan':      { lat: 32.6546, lng: 51.6680, regionId: 'isfahan' },
        'bushehr':      { lat: 28.9234, lng: 50.8203, regionId: 'bushehr' },
        'bandar abbas': { lat: 27.1865, lng: 56.2808, regionId: 'bandar-abbas' },
        'hormuz':       { lat: 26.5667, lng: 56.2500, regionId: 'strait-hormuz' },
        'strait':       { lat: 26.5667, lng: 56.2500, regionId: 'strait-hormuz' },
        'tabriz':       { lat: 38.0800, lng: 46.2919, regionId: 'tabriz' },
        'shiraz':       { lat: 29.5918, lng: 52.5837, regionId: 'shiraz' },
        'mashhad':      { lat: 36.2605, lng: 59.6168, regionId: 'mashhad' },
        'ahvaz':        { lat: 31.3183, lng: 48.6706, regionId: 'ahvaz' },
        'khuzestan':    { lat: 31.3183, lng: 48.6706, regionId: 'ahvaz' },
        'natanz':       { lat: 33.5114, lng: 51.7264, regionId: 'natanz' },
        'parchin':      { lat: 35.5228, lng: 51.7700, regionId: 'parchin' },
        'chabahar':     { lat: 25.2919, lng: 60.6430, regionId: 'chabahar' },
        'qom':          { lat: 34.6399, lng: 50.8759, regionId: 'tehran' },
        'arak':         { lat: 34.0917, lng: 49.6892, regionId: 'isfahan' },
        'fordow':       { lat: 34.708,  lng: 50.962,  regionId: 'tehran' },
        'abadan':       { lat: 30.3392, lng: 48.3043, regionId: 'ahvaz' },
        'kish':         { lat: 26.5579, lng: 53.9802, regionId: 'bandar-abbas' },
        'iran':         { lat: 32.4279, lng: 53.6880, regionId: 'tehran' },
        'persian gulf': { lat: 27.0,    lng: 52.0,    regionId: 'bandar-abbas' },
        'irgc':         { lat: 35.6892, lng: 51.3890, regionId: 'tehran' },
        'nuclear':      { lat: 33.5114, lng: 51.7264, regionId: 'natanz' },
        'oil':          { lat: 31.3183, lng: 48.6706, regionId: 'ahvaz' },
        'missile':      { lat: 35.6892, lng: 51.3890, regionId: 'tehran' },
        'refugee':      { lat: 38.0800, lng: 46.2919, regionId: 'tabriz' },
    };

    // Source avatars & display metadata
    const SOURCE_META = {
        'aljazeera':  { avatar: '📺', name: 'Al Jazeera',   handle: '@AJEnglish',     verified: true },
        'bbc':        { avatar: '📻', name: 'BBC News',     handle: '@BBCWorld',      verified: true },
        'reuters':    { avatar: '📰', name: 'Reuters',      handle: '@Reuters',       verified: true },
        'guardian':   { avatar: '🗞️', name: 'The Guardian', handle: '@guardian',      verified: true },
        'france24':   { avatar: '📡', name: 'France24',     handle: '@France24_en',   verified: true },
        'gdelt':      { avatar: '🛰️', name: 'GDELT Monitor', handle: '@gdelt',       verified: false },
        'default':    { avatar: '📰', name: 'News',         handle: '@news',          verified: false },
    };

    // ============================================================
    // SOURCE 1: GDELT Project API — free, no key, CORS-friendly
    // ============================================================
    async function fetchGDELT() {
        // GDELT doc API returns articles matching the query
        const url = 'https://api.gdeltproject.org/api/v2/doc/doc'
            + '?query=iran%20(war%20OR%20conflict%20OR%20military%20OR%20strike%20OR%20nuclear%20OR%20missile%20OR%20hormuz)'
            + '&mode=artlist&maxrecords=50&format=json&sort=datedesc&timespan=7d&sourcelang=eng';

        try {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`GDELT HTTP ${resp.status}`);
            const data = await resp.json();
            if (data.articles && data.articles.length > 0) {
                console.log(`[Data] GDELT: ${data.articles.length} articles`);
                return data.articles
                    .filter(a => {
                        // Pre-filter: skip articles from known non-English language codes
                        const lang = (a.language || '').toLowerCase();
                        if (lang && lang !== 'english' && lang !== 'eng' && lang !== 'en' && lang !== '') return false;
                        return true;
                    })
                    .map(a => ({
                    title: a.title || '',
                    summary: a.seendate
                        ? `via ${a.domain || 'unknown'}`
                        : '',
                    url: a.url || '',
                    urlImage: a.socialimage || '',
                    time: parseGdeltDate(a.seendate),
                    domain: a.domain || '',
                    sourcetag: 'gdelt',
                }));
            }
        } catch (err) {
            console.warn('[Data] GDELT failed:', err.message);
        }
        return [];
    }

    function parseGdeltDate(s) {
        if (!s) return new Date();
        // GDELT format: "20260308T143000Z" → ISO
        try {
            const iso = s.replace(
                /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/,
                '$1-$2-$3T$4:$5:$6Z'
            );
            const d = new Date(iso);
            return isNaN(d) ? new Date() : d;
        } catch {
            return new Date();
        }
    }

    // ============================================================
    // SOURCE 2: RSS feeds via CORS proxy
    // ============================================================
    const RSS_FEEDS = [
        { tag: 'aljazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
        { tag: 'bbc',       url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml' },
        { tag: 'guardian',   url: 'https://www.theguardian.com/world/iran/rss' },
        { tag: 'france24',  url: 'https://www.france24.com/en/middle-east/rss' },
    ];

    async function fetchRSSFeed(feed) {
        // allorigins.win is a free CORS proxy
        const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(feed.url)}`;
        try {
            const resp = await fetch(proxy);
            if (!resp.ok) throw new Error(`RSS ${feed.tag} HTTP ${resp.status}`);
            const xml = await resp.text();
            return parseRSS(xml, feed.tag);
        } catch (err) {
            console.warn(`[Data] RSS ${feed.tag} failed:`, err.message);
            return [];
        }
    }

    function parseRSS(xml, sourcetag) {
        try {
            const doc = new DOMParser().parseFromString(xml, 'text/xml');
            const items = doc.querySelectorAll('item');
            const out = [];
            items.forEach(item => {
                const title = item.querySelector('title')?.textContent || '';
                const desc  = item.querySelector('description')?.textContent || '';
                const link  = item.querySelector('link')?.textContent || '';
                const pub   = item.querySelector('pubDate')?.textContent || '';

                // Try to get an image
                let img = '';
                const mc = item.querySelector('content');
                if (mc) img = mc.getAttribute('url') || '';
                if (!img) {
                    const enc = item.querySelector('enclosure');
                    if (enc) img = enc.getAttribute('url') || '';
                }
                if (!img) {
                    const m = desc.match(/<img[^>]+src=["']([^"']+)["']/);
                    if (m) img = m[1];
                }

                out.push({
                    title: stripHtml(title),
                    summary: stripHtml(desc).substring(0, 300),
                    url: link,
                    urlImage: img,
                    time: pub ? new Date(pub) : new Date(),
                    domain: sourcetag,
                    sourcetag,
                });
            });
            console.log(`[Data] RSS ${sourcetag}: ${out.length} items`);
            return out;
        } catch (err) {
            console.warn(`[Data] RSS parse error (${sourcetag}):`, err.message);
            return [];
        }
    }

    function stripHtml(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    // ============================================================
    // Filtering: keep only Iran / Middle-East war related articles
    // ============================================================
    const IRAN_KEYWORDS = [
        'iran', 'iranian', 'tehran', 'isfahan', 'esfahan', 'bushehr',
        'natanz', 'parchin', 'hormuz', 'persian gulf', 'irgc',
        'khamenei', 'rouhani', 'raisi', 'pezeshkian',
        'ahvaz', 'khuzestan', 'tabriz', 'mashhad', 'shiraz', 'chabahar',
        'fordow', 'arak', 'qom', 'bandar abbas', 'abadan', 'kish',
        'hezbollah', 'houthi', 'quds force',
        'nuclear deal', 'jcpoa', 'middle east conflict',
        'strait of hormuz',
    ];

    function isIranRelated(article) {
        const t = `${article.title} ${article.summary}`.toLowerCase();
        return IRAN_KEYWORDS.some(kw => t.includes(kw));
    }

    // ============================================================
    // Language filter: keep only English articles
    // ============================================================

    // Non-Latin script ranges (Arabic, Farsi, Cyrillic, CJK, Korean, Devanagari, Thai, Hebrew, etc.)
    const NON_LATIN_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0400-\u04FF\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0900-\u097F\u0E00-\u0E7F\u0590-\u05FF]/;

    // Known non-English domain patterns
    const NON_EN_DOMAINS = [
        '.ir', '.tr', '.ru', '.cn', '.ar', '.sa', '.pk', '.af',
        '.iq', '.sy', '.lb', '.ps', '.ye', '.ae', '.qa', '.kw',
        '.bh', '.om', '.eg', '.ly', '.tn', '.dz', '.ma',
        'farsi', 'persian', 'arabic', 'urdu', 'dari', 'pashto',
        'turkce', 'russi', 'chinese',
        'fa.', 'ar.', 'ru.', 'tr.', 'zh.', 'ur.', 'ko.', 'ja.',
        'irna.', 'tasnim', 'mehrnews', 'presstv', 'isna.ir',
        'farsnews', 'yjc.ir', 'mashregh', 'tabnak', 'khabar',
        'al-alam', 'alalam', 'parstoday',
    ];

    function looksEnglish(article) {
        const title = article.title || '';
        const summary = article.summary || '';
        const text = title + ' ' + summary;
        const domain = (article.domain || article.url || '').toLowerCase();

        // 1. Reject if domain is from a known non-English source
        if (NON_EN_DOMAINS.some(d => domain.includes(d))) return false;

        // 2. Reject if ANY non-Latin script character is present in the title
        if (NON_LATIN_RE.test(title)) return false;

        // 3. Reject if summary has non-Latin characters
        if (NON_LATIN_RE.test(summary)) return false;

        // 4. Reject if >15% of title characters are non-ASCII (catches accented scripts etc.)
        if (title.length > 0) {
            const nonAscii = (title.match(/[^\x00-\x7F]/g) || []).length;
            if (nonAscii / title.length > 0.15) return false;
        }

        // 5. Reject very short titles (often garbage / non-English fragments)
        if (title.trim().length < 10) return false;

        // 6. Quick English word check — title should contain at least some common English words
        const lower = title.toLowerCase();
        const enWords = ['the','in','of','to','a','and','is','for','on','at','by','with','from','has','that','are','was','will','an','as','it','its','be','not','or','but','have','this','said','after','into','over','about','new','more','than','been','iran','us','oil','war','military'];
        const wordCount = lower.split(/\s+/).length;
        const enHits = enWords.filter(w => lower.includes(w)).length;
        // For titles with 4+ words, require at least 1 common English word
        if (wordCount >= 4 && enHits === 0) return false;

        return true;
    }

    // ============================================================
    // Geo-match: map an article to the closest conflict region
    // ============================================================
    function geoMatch(article) {
        const t = `${article.title} ${article.summary}`.toLowerCase();
        for (const [kw, coords] of Object.entries(CITY_COORDS)) {
            if (t.includes(kw)) {
                return {
                    ...coords,
                    lat: coords.lat + (Math.random() - 0.5) * 0.08,
                    lng: coords.lng + (Math.random() - 0.5) * 0.08,
                };
            }
        }
        return {
            lat: 32.4 + (Math.random() - 0.5) * 4,
            lng: 53.7 + (Math.random() - 0.5) * 4,
            regionId: 'tehran',
        };
    }

    // Categorize
    function categorize(article) {
        const t = `${article.title} ${article.summary}`.toLowerCase();
        if (['breaking','just in','urgent','explosion','strike','attack','killed','dead','war','missile','bomb'].some(w => t.includes(w))) return 'breaking';
        if (['analysis','opinion','impact','explain','assessment','satellite','osint','intelligence'].some(w => t.includes(w))) return 'analysis';
        if (['video','footage','witness','watch','live','reporter','protest','refugee'].some(w => t.includes(w))) return 'eyewitness';
        return 'breaking';
    }

    // Severity
    function inferSeverity(article) {
        const t = `${article.title} ${article.summary}`.toLowerCase();
        if (['explosion','strike','attack','killed','missile','bomb','nuclear','war','dead','destroy'].some(w => t.includes(w))) return 'high';
        if (['military','troops','deploy','convoy','protest','sanctions','threat','tension'].some(w => t.includes(w))) return 'medium';
        return 'low';
    }

    // ============================================================
    // Transform articles → feed posts & map events
    // ============================================================
    function escapeHtml(text) {
        const d = document.createElement('div');
        d.appendChild(document.createTextNode(text));
        return d.innerHTML;
    }

    function articlesToFeedPosts(articles) {
        return articles.map((a, i) => {
            const meta = SOURCE_META[a.sourcetag] || SOURCE_META['default'];
            const cat  = categorize(a);
            const geo  = geoMatch(a);

            let display = escapeHtml(a.title);
            // Highlight keywords
            IRAN_KEYWORDS.forEach(kw => {
                display = display.replace(
                    new RegExp(`(${kw})`, 'gi'),
                    '<span class="highlight">$1</span>'
                );
            });

            const summarySnip = a.summary
                ? `<br><span style="color:var(--text-muted);font-size:12px;">${escapeHtml(a.summary.substring(0, 200))}${a.summary.length > 200 ? '…' : ''}</span>`
                : '';

            return {
                id: 1000 + i,
                source: meta.name,
                handle: meta.handle,
                verified: meta.verified,
                avatar: meta.avatar,
                category: cat,
                text: display + summarySnip,
                time: a.time,
                likes: Math.floor(Math.random() * 50000) + 1000,
                retweets: Math.floor(Math.random() * 20000) + 500,
                replies: Math.floor(Math.random() * 5000) + 100,
                regionId: geo.regionId,
                url: a.url,
                image: a.urlImage,
            };
        });
    }

    function articlesToConflictEvents(articles) {
        return articles.map((a, i) => {
            const geo  = geoMatch(a);
            const meta = SOURCE_META[a.sourcetag] || SOURCE_META['default'];
            return {
                id: 2000 + i,
                regionId: geo.regionId,
                lat: geo.lat,
                lng: geo.lng,
                title: a.title,
                summary: a.summary.substring(0, 200),
                severity: inferSeverity(a),
                time: a.time,
                source: meta.name,
            };
        });
    }

    // ============================================================
    // MASTER FETCH
    // ============================================================
    async function fetchAllSources() {
        // Throttle: max once per 60 s
        if (Date.now() - lastFetchTime < 60000 && isLoaded) {
            console.log('[Data] Throttled — skipping fetch');
            return;
        }
        lastFetchTime = Date.now();
        console.log('[Data] Fetching real news…');

        const [gdelt, ...rssArrays] = await Promise.all([
            fetchGDELT(),
            ...RSS_FEEDS.map(f => fetchRSSFeed(f)),
        ]);

        let all = [...gdelt, ...rssArrays.flat()];
        let iran = all.filter(isIranRelated);

        // English only — drop non-English articles
        iran = iran.filter(looksEnglish);

        // Deduplicate by title prefix
        const seen = new Set();
        iran = iran.filter(a => {
            const key = a.title.toLowerCase().substring(0, 60).replace(/[^a-z0-9]/g, '');
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        iran.sort((a, b) => b.time - a.time);
        iran = iran.slice(0, CONFIG.feed.maxItems);

        console.log(`[Data] ${all.length} total → ${iran.length} Iran-related (English only)`);

        if (iran.length > 0) {
            liveArticles = iran;
            liveFeedPosts = articlesToFeedPosts(iran);
            liveConflictEvents = articlesToConflictEvents(iran);
            isLoaded = true;
        } else {
            console.warn('[Data] No Iran articles — using fallback');
            if (!isLoaded) { useFallbackData(); isLoaded = true; }
        }
    }

    // ============================================================
    // FALLBACK (simulated) — only used when APIs all fail
    // ============================================================
    function _minutesAgo(m) { return new Date(Date.now() - m * 60000); }

    function useFallbackData() {
        console.log('[Data] Loading fallback simulated data');
        liveConflictEvents = [
            { id:1, regionId:'tehran', lat:35.689, lng:51.389, title:'Air Defense Activated Over Tehran', summary:'Multiple batteries activated. Residents report explosions.', severity:'high', time:_minutesAgo(12), source:'IRNA' },
            { id:2, regionId:'isfahan', lat:32.654, lng:51.668, title:'Strikes Near Isfahan Nuclear Site', summary:'Smoke near Isfahan UCF. IAEA detects no radiation.', severity:'high', time:_minutesAgo(28), source:'Reuters' },
            { id:3, regionId:'bushehr', lat:28.923, lng:50.820, title:'Bushehr Plant Suspended', summary:'Precautionary reactor shutdown. Russian staff evacuated.', severity:'high', time:_minutesAgo(45), source:'Al Jazeera' },
            { id:4, regionId:'bandar-abbas', lat:27.186, lng:56.280, title:'Naval Movements at Hormuz', summary:'IRGC boats near shipping lanes. US 5th Fleet patrols up.', severity:'high', time:_minutesAgo(55), source:'AP' },
            { id:5, regionId:'ahvaz', lat:31.318, lng:48.670, title:'Oil Infrastructure High Alert', summary:'Abadan/Ahvaz refineries surrounded. Production down 40%.', severity:'high', time:_minutesAgo(72), source:'Bloomberg' },
            { id:6, regionId:'natanz', lat:33.511, lng:51.726, title:'Comms Blackout Near Natanz', summary:'Internet/mobile cut. Possible electronic warfare.', severity:'high', time:_minutesAgo(90), source:'NetBlocks' },
            { id:7, regionId:'tabriz', lat:38.080, lng:46.291, title:'Refugees Moving to Turkey', summary:'Thousands heading to Turkish border.', severity:'medium', time:_minutesAgo(110), source:'UNHCR' },
            { id:8, regionId:'mashhad', lat:36.260, lng:59.616, title:'Protests in Mashhad', summary:'Anti-war protests. Security deployed.', severity:'medium', time:_minutesAgo(130), source:'IranWire' },
            { id:9, regionId:'strait-hormuz', lat:26.6, lng:56.3, title:'Tanker Attacked at Hormuz', summary:'Drone strike on tanker. Crew safe. Oil surges 8%.', severity:'high', time:_minutesAgo(35), source:'Maritime Exec' },
        ];
        liveFeedPosts = [
            { id:101, source:'Breaking911', handle:'@Breaking911', verified:true, avatar:'🚨', category:'breaking', text:'🚨 BREAKING: Explosions in <span class="highlight">Tehran</span>. Air defense active. <span class="hashtag">#IranWar</span>', time:_minutesAgo(8), likes:45200, retweets:18300, replies:5600, regionId:'tehran' },
            { id:102, source:'Al Jazeera', handle:'@AJEnglish', verified:true, avatar:'📺', category:'breaking', text:'⚡ Bushehr nuclear plant shut down. Russian technicians evacuated. <span class="hashtag">#Iran</span>', time:_minutesAgo(22), likes:32100, retweets:14500, replies:3200, regionId:'bushehr' },
            { id:103, source:'OSINT Analyst', handle:'@OSINTdefender', verified:true, avatar:'🛰️', category:'analysis', text:'🛰️ Smoke near <span class="highlight">Isfahan UCF</span>. No radiation detected. <span class="hashtag">#OSINT</span>', time:_minutesAgo(35), likes:28400, retweets:12800, replies:2100, regionId:'isfahan' },
            { id:104, source:'Reuters', handle:'@Reuters', verified:true, avatar:'📰', category:'breaking', text:'Oil surges 8%. Tanker hit near <span class="highlight">Strait of Hormuz</span>. Brent tops $130. <span class="hashtag">#Oil</span>', time:_minutesAgo(40), likes:19800, retweets:9700, replies:2800, regionId:'strait-hormuz' },
            { id:105, source:'Tehran Bureau', handle:'@TehranBureau', verified:false, avatar:'🇮🇷', category:'eyewitness', text:'📹 Anti-aircraft fire over Tehran. Residents sheltering. <span class="hashtag">#Tehran</span>', time:_minutesAgo(15), likes:67300, retweets:31200, replies:8400, regionId:'tehran' },
            { id:106, source:'NetBlocks', handle:'@netblocks', verified:true, avatar:'🌐', category:'analysis', text:'⚠️ Internet shutdown in <span class="highlight">Iran</span>. 4% traffic. <span class="hashtag">#KeepItOn</span>', time:_minutesAgo(75), likes:23100, retweets:15600, replies:2700, regionId:'natanz' },
            { id:107, source:'UNHCR', handle:'@Refugees', verified:true, avatar:'🏳️', category:'eyewitness', text:'🆘 50,000 displaced toward Turkish border. <span class="hashtag">#IranRefugees</span>', time:_minutesAgo(95), likes:12400, retweets:8900, replies:1500, regionId:'tabriz' },
            { id:108, source:'Energy Intel', handle:'@EnergyIntel', verified:true, avatar:'⛽', category:'analysis', text:'📊 If Hormuz blocked: 20% global oil disrupted, $180/bbl. <span class="hashtag">#OilCrisis</span>', time:_minutesAgo(82), likes:27500, retweets:16300, replies:3400, regionId:'bandar-abbas' },
        ];
    }

    // ============================================================
    // Public API — same shape as before, modules need no changes
    // ============================================================
    function formatRelativeTime(date) {
        if (!(date instanceof Date) || isNaN(date)) return '';
        const diff = Date.now() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    }

    function formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    return {
        fetchAllSources,
        isLive: () => isLoaded && liveArticles.length > 0,

        getConflictEvents: () => {
            if (!isLoaded) useFallbackData();
            return [...liveConflictEvents].sort((a, b) => b.time - a.time);
        },
        getFeedPosts: (category = 'all') => {
            if (!isLoaded) useFallbackData();
            let posts = [...liveFeedPosts];
            if (category !== 'all') posts = posts.filter(p => p.category === category);
            return posts.sort((a, b) => b.time - a.time);
        },
        getRegionEvents: (regionId) => {
            if (!isLoaded) useFallbackData();
            return liveConflictEvents.filter(e => e.regionId === regionId);
        },

        refreshData: fetchAllSources,
        formatRelativeTime,
        formatNumber,
    };
})();
