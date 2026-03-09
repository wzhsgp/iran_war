/* =========================================================
   APP.JS — Main Controller
   ========================================================= */

(async function () {
  'use strict';

  /* ---- UTC Clock ---- */
  function startClock() {
    const el = document.getElementById('clock');
    if (!el) return;
    const tick = () => {
      const now = new Date();
      const hh = String(now.getUTCHours()).padStart(2, '0');
      const mm = String(now.getUTCMinutes()).padStart(2, '0');
      const ss = String(now.getUTCSeconds()).padStart(2, '0');
      el.textContent = `${hh}:${mm}:${ss}Z`;
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---- Header buttons ---- */
  function setupHeaderButtons() {
    const refreshBtn = document.getElementById('btn-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.style.opacity = '0.4';
        refreshBtn.style.pointerEvents = 'none';
        await refreshData();
        refreshBtn.style.opacity = '';
        refreshBtn.style.pointerEvents = '';
      });
    }

    const fsBtn = document.getElementById('btn-fullscreen');
    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }
  }

  /* ---- Refresh ---- */
  async function refreshData() {
    try {
      await DataService.refreshData();
      FeedManager.renderFeed();
      ConflictMap.refresh();
    } catch (err) {
      console.error('[REFRESH]', err);
    }
  }

  /* ---- Boot sequence ---- */
  startClock();
  setupHeaderButtons();

  try {
    /* Initial data load */
    await DataService.refreshData();

    /* Init subsystems */
    ConflictMap.init();
    FeedManager.init();

    /* First render */
    FeedManager.renderFeed();
    /* map.js auto-starts tour in init() after 2s */

    /* Auto-refresh every 2 min */
    setInterval(refreshData, 2 * 60 * 1000);

    console.log('%c[SIGINT] System operational', 'color:#00e676;font-weight:bold');
  } catch (err) {
    console.error('[BOOT]', err);
  }

  /* ---- Register service worker ---- */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(e => console.warn('SW:', e));
  }
})();
