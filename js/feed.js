/* =========================================================
   FEED.JS — Intelligence Brief Feed Renderer
   ========================================================= */

const FeedManager = (() => {
  let currentCategory = 'all';
  let feedList = null;
  let feedLoading = null;
  let modal = null;

  /* ---- severity classifier ---- */
  function classifySeverity(post) {
    const text = (post.text || '').toLowerCase();
    const critical = ['strike', 'bomb', 'attack', 'missile', 'killed', 'explosion', 'casualt', 'dead', 'airstrike', 'war', 'invasion'];
    const warning  = ['tension', 'threat', 'deploy', 'mobiliz', 'sanction', 'nuclear', 'escalat', 'military', 'weapon', 'drone'];
    if (critical.some(k => text.includes(k))) return 'critical';
    if (warning.some(k => text.includes(k)))  return 'warning';
    return 'normal';
  }

  /* ---- extract plain text from HTML ---- */
  function stripHtml(html) {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  /* ---- single card ---- */
  function createCard(post) {
    const severity = classifySeverity(post);
    const card = document.createElement('div');
    card.className = 'feed-card';
    card.dataset.severity = severity;

    const timeStr = DataService.formatRelativeTime(post.time);
    const sourceTag = post.source ? post.source.toUpperCase().replace(/\s/g, '') : 'OSINT';
    const categoryTag = (post.category || 'general').toUpperCase();
    const plainText = stripHtml(post.text);

    card.innerHTML = `
      <div class="card-header">
        <div class="card-tags">
          <span class="tag tag-source">${sourceTag}</span>
          <span class="tag tag-category">${categoryTag}</span>
          ${severity === 'critical' ? '<span class="tag tag-alert">FLASH</span>' : ''}
        </div>
        <span class="card-time">${timeStr}</span>
      </div>
      <h3 class="card-title">${escapeHtml(truncate(plainText, 120))}</h3>
      ${post.regionId ? `<div class="card-location"><span class="loc-icon">◉</span> ${escapeHtml(post.regionId.toUpperCase().replace('-', ' '))}</div>` : ''}
    `;

    card.addEventListener('click', () => openModal(post, severity));
    return card;
  }

  /* ---- render full feed ---- */
  function renderFeed(category) {
    currentCategory = category || currentCategory;
    if (!feedList) return;

    const posts = DataService.getFeedPosts(currentCategory);

    /* hide loading spinner */
    if (feedLoading) feedLoading.style.display = 'none';

    feedList.innerHTML = '';

    if (!posts || posts.length === 0) {
      feedList.innerHTML = `
        <div class="empty-feed">
          <div class="empty-icon">⊘</div>
          <div class="empty-text">NO INTEL MATCHING FILTER</div>
          <div class="empty-sub">Adjust classification or wait for new intercepts</div>
        </div>`;
      return;
    }

    posts.forEach(post => feedList.appendChild(createCard(post)));

    /* update header article count */
    const countEl = document.getElementById('article-count');
    if (countEl) {
      const total = DataService.getFeedPosts('all');
      countEl.textContent = (total ? total.length : 0) + ' FEEDS';
    }
  }

  /* ---- modal ---- */
  function openModal(post, severity) {
    if (!modal) return;
    const timeStr = DataService.formatRelativeTime(post.time);
    const sourceTag = post.source ? post.source.toUpperCase().replace(/\s/g, '') : 'OSINT';
    const plainText = stripHtml(post.text);
    const regionName = post.regionId ? post.regionId.toUpperCase().replace('-', ' ') : '';

    const body = document.getElementById('modal-body');
    body.innerHTML = `
      <div class="modal-meta">
        <span class="modal-source">${sourceTag}</span>
        <span class="modal-sep">·</span>
        <span class="modal-time">${timeStr}</span>
        ${regionName ? `<span class="modal-sep">·</span><span class="modal-region">◉ ${escapeHtml(regionName)}</span>` : ''}
      </div>
      <h2 class="modal-title">${escapeHtml(plainText)}</h2>
      ${post.url ? `<a href="${post.url}" target="_blank" rel="noopener" class="modal-link">OPEN SOURCE ↗</a>` : ''}
    `;

    /* severity bar colour */
    const bar = modal.querySelector('.modal-header-bar');
    if (bar) {
      bar.style.borderTopColor =
        severity === 'critical' ? 'var(--red)' :
        severity === 'warning'  ? 'var(--amber)' :
        'var(--green)';
    }

    modal.classList.remove('hidden');
  }

  function closeModal() {
    if (modal) modal.classList.add('hidden');
  }

  /* ---- tabs ---- */
  function setupTabs() {
    document.querySelectorAll('#feed-tabs .tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#feed-tabs .tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderFeed(btn.dataset.source);
      });
    });
  }

  /* ---- helpers ---- */
  function escapeHtml(str) {
    if (!str) return '';
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  function truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.substring(0, max) + '…' : str;
  }

  /* ---- init ---- */
  function init() {
    feedList = document.getElementById('feed-list');
    feedLoading = document.getElementById('feed-loading');
    modal = document.getElementById('modal');

    setupTabs();

    /* close modal events */
    const closeBtn = modal ? modal.querySelector('.modal-close') : null;
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    /* click outside modal content to close */
    if (modal) {
      modal.addEventListener('click', e => {
        if (e.target === modal) closeModal();
      });
    }
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  }

  return { init, renderFeed, closeModal };
})();
