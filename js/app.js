/**
 * JTKiaz App — front end
 * A single small vanilla-JS app. No build step needed to run it —
 * only to regenerate js/data.js from your Excel/CSV (see build-data.js).
 *
 * New in this version (see README §13–18):
 *   - per-book / per-poem accent color, font and ambient track
 *   - chapter hero images + inline text popups (image/audio/video/link)
 *   - reader toolbar: font-size control, fullscreen, scroll progress
 *   - engagement bar: view count + like (via the free CountAPI service),
 *     share buttons, and a "comment via WhatsApp" link
 *   - a gleaming footer CTA that changes its pitch per tab/item
 *   - a themed sponsor CTA on the home screen and every tab's header (§16.1)
 *   - a "playlist" sponsor-cart — collect books/chapters/poems/songs and
 *     send the whole list to WhatsApp in one message (§16)
 *   - Promo Popups: timed, animated pop-up ads (with sound + a WhatsApp
 *     button on every one) driven entirely from the workbook (§17)
 */
(function () {
  'use strict';

  // =========================================================
  // CONFIG — the only two lines you need to edit to go live
  // =========================================================
  const WHATSAPP_NUMBER = '263787726262'; // live — wa.me/263787726262 (see README §14)
  const COUNTAPI_NAMESPACE = 'jtkiaz-app-v1'; // TODO: change this to something unique to you before launch (see README §14)
  const FACEBOOK_PAGE_URL = 'https://www.facebook.com/profile.php?id=61590231961322'; // JT KIAS Facebook Page — see README §8.11

  // ---- branding / visual config — see README §21 "Image size cheat-sheet" ----
  const LOGO_IMAGE = 'covers/icon.webp'; // small logo, shown in header/footer/watermarks — drop your file at assets/images/branding/jtk-logo.png
  const MUSIC_HERO_IMAGE = 'covers/music_banner.webp'; // single banner image on top of the Music tab
  const MUSIC_HERO_TITLE = 'Hippy Vibes International Studio';
  const MUSIC_HERO_SUBTITLE = 'Where music comes alive...';
  // Track artwork: each track can have its own `artwork` column (same
  // relative-path convention as book covers). Any track without one falls
  // back to a shared image for its `type` (optional, set below), then to
  // MUSIC_ARTWORK_FALLBACK. See README §7/§21.
  const MUSIC_TYPE_IMAGES = {};
  const MUSIC_ARTWORK_FALLBACK = 'covers/track_image.webp';
  // Poems: one default cover image per collection (used by every poem in that
  // collection unless that poem has its own `image` column filled in). Keys
  // are matched case-insensitively against the `collection` column.
  const POEM_COLLECTION_IMAGES = {
    'micro': 'poem-collections/micro.jpg',
    'short': 'poem-collections/short.jpg',
    'long': 'poem-collections/long.jpg',
    'spoken word': 'poem-collections/spoken-word.jpg'
  };
  const POEM_IMAGE_FALLBACK = 'poem-collections/default.jpg'; // used for any collection not listed above

  const DATA = window.JTKIAZ_DATA || { books: [], poems: [], quotes: [], music: [], blog: [], promoPopups: [] };
  const root = document.getElementById('view-root');
  const tabButtons = document.querySelectorAll('.tabnav button');
  const toastEl = document.getElementById('toast');
  const scrollProgressEl = document.getElementById('scroll-progress');
  const footerCtaTextEl = document.getElementById('footer-cta-text');
  const footerCtaBtnEl = document.getElementById('footer-cta-btn');
  const playlistBtnEl = document.getElementById('playlist-btn');
  const playlistCountEl = document.getElementById('playlist-count');

  // ---------------- progress (localStorage) ----------------
  const PROGRESS_KEY = 'jtkiaz_progress_v1';
  function getProgress() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveProgress(p) {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch (e) { /* storage unavailable */ }
  }
  function unlockedSet(bookId) {
    const p = getProgress();
    return new Set(p[bookId] && p[bookId].unlocked ? p[bookId].unlocked : [1]);
  }
  function markChapterRead(bookId, chapterNumber, totalChapters) {
    const p = getProgress();
    if (!p[bookId]) p[bookId] = { unlocked: [1], lastRead: 0 };
    const set = new Set(p[bookId].unlocked);
    set.add(chapterNumber);
    if (chapterNumber < totalChapters) set.add(chapterNumber + 1);
    p[bookId].unlocked = Array.from(set);
    p[bookId].lastRead = Math.max(p[bookId].lastRead, chapterNumber);
    saveProgress(p);
  }

  // ---------------- reader preferences (font size) ----------------
  const FONT_KEY = 'jtkiaz_font_scale_v1';
  const FONT_MIN = 0.85, FONT_MAX = 1.5, FONT_STEP = 0.1;
  function getFontScale() {
    const v = parseFloat(localStorage.getItem(FONT_KEY));
    return isNaN(v) ? 1 : v;
  }
  function setFontScale(v) {
    const clamped = Math.min(FONT_MAX, Math.max(FONT_MIN, Math.round(v * 10) / 10));
    document.documentElement.style.setProperty('--reader-scale', clamped);
    try { localStorage.setItem(FONT_KEY, String(clamped)); } catch (e) { /* ignore */ }
    return clamped;
  }
  setFontScale(getFontScale());

  // ---------------- theme (light / dark) — README §8.9.2 ----------------
  const THEME_KEY = 'jtkiaz_theme_v1';
  const themeToggleBtn = document.getElementById('theme-toggle');
  function getTheme() {
    try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch (e) { return 'light'; }
  }
  function applyTheme(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    if (themeToggleBtn) themeToggleBtn.textContent = mode === 'dark' ? '☀️' : '🌙';
    if (themeToggleBtn) themeToggleBtn.setAttribute('aria-label', mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    try { localStorage.setItem(THEME_KEY, mode); } catch (e) { /* ignore */ }
  }
  applyTheme(getTheme());
  if (themeToggleBtn) themeToggleBtn.addEventListener('click', () => applyTheme(getTheme() === 'dark' ? 'light' : 'dark'));

  const LIKED_KEY = 'jtkiaz_liked_v1';
  function getLiked() {
    try { return JSON.parse(localStorage.getItem(LIKED_KEY)) || {}; } catch (e) { return {}; }
  }
  function markLiked(key) {
    const l = getLiked(); l[key] = true;
    try { localStorage.setItem(LIKED_KEY, JSON.stringify(l)); } catch (e) { /* ignore */ }
  }

  // =========================================================
  // PLAYLIST ("sponsor cart") — README §16
  // Lets a reader collect books/chapters/poems/tracks as they browse,
  // then send the whole list to you on WhatsApp in one message asking
  // to sponsor them. Stored locally on the reader's device.
  // =========================================================
  const PLAYLIST_KEY = 'jtkiaz_playlist_v1';
  function getPlaylist() {
    try { return JSON.parse(localStorage.getItem(PLAYLIST_KEY)) || []; } catch (e) { return []; }
  }
  function savePlaylist(list) {
    try { localStorage.setItem(PLAYLIST_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
    updatePlaylistBadge();
  }
  function playlistKey(type, id) { return `${type}:${id}`; }
  function isInPlaylist(type, id) {
    return getPlaylist().some(it => it.key === playlistKey(type, id));
  }
  function addToPlaylist(item) {
    const list = getPlaylist();
    const key = playlistKey(item.type, item.id);
    if (list.some(it => it.key === key)) { showToast('Already in your playlist'); return; }
    list.push(Object.assign({ key, addedAt: Date.now() }, item));
    savePlaylist(list);
    showToast('✓ Added to playlist');
  }
  function removeFromPlaylist(key) {
    savePlaylist(getPlaylist().filter(it => it.key !== key));
  }
  function updatePlaylistBadge() {
    if (!playlistCountEl) return;
    const n = getPlaylist().length;
    playlistCountEl.textContent = n;
    playlistCountEl.hidden = n === 0;
  }
  const TYPE_LABEL = { book: 'Book', 'book-chapter': 'Chapter', poem: 'Poem', track: 'Song' };
  function playlistAddBtnHTML(type, id, title, subtitle, cover) {
    const added = isInPlaylist(type, id);
    return `<button class="playlist-add-btn ${added ? 'added' : ''}" data-pl-type="${esc(type)}" data-pl-id="${esc(id)}" data-pl-title="${esc(title)}" data-pl-subtitle="${esc(subtitle || '')}" data-pl-cover="${esc(cover || '')}">${added ? '✓ In playlist' : '+ Playlist'}</button>`;
  }
  function wirePlaylistButtons(container) {
    (container || document).querySelectorAll('.playlist-add-btn').forEach(btn => {
      if (btn._wired) return;
      btn._wired = true;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.dataset.plType, id = btn.dataset.plId;
        if (isInPlaylist(type, id)) { showToast('Already in your playlist'); return; }
        addToPlaylist({ type, id, title: btn.dataset.plTitle, subtitle: btn.dataset.plSubtitle, cover: btn.dataset.plCover });
        btn.classList.add('added');
        btn.textContent = '✓ In playlist';
      });
    });
  }

  function openPlaylistPanel() {
    var _plOverlay = document.querySelector('.playlist-overlay'); if (_plOverlay) _plOverlay.remove();
    const list = getPlaylist();
    const overlay = document.createElement('div');
    overlay.className = 'playlist-overlay';
    overlay.innerHTML = `
      <div class="playlist-panel">
        <div class="playlist-head">
          <h3>🎵 Your playlist</h3>
          <span class="modal-close" data-close>✕ Close</span>
        </div>
        <p class="playlist-sub">Books, chapters, poems and songs you've collected — send the list to J.T. KIAS and ask to sponsor them.</p>
        <div class="playlist-items">
          ${list.length ? list.map(it => `
            <div class="playlist-item">
              <div>
                <span class="playlist-item-type">${esc(TYPE_LABEL[it.type] || it.type)}</span>
                <strong>${esc(it.title)}</strong>
                ${it.subtitle ? `<span class="playlist-item-sub">${esc(it.subtitle)}</span>` : ''}
              </div>
              <button class="playlist-remove" data-remove="${esc(it.key)}" aria-label="Remove">✕</button>
            </div>
          `).join('') : `<div class="empty-state">Nothing yet — tap <strong>+ Playlist</strong> on any book, chapter, poem or song.</div>`}
        </div>
        ${list.length ? `<a class="btn accent playlist-sponsor-btn" id="playlist-sponsor-btn" target="_blank" rel="noopener">💛 Sponsor this playlist on WhatsApp</a>` : ''}
      </div>
    `;
    overlay.addEventListener('click', (e) => { if (e.target === overlay || e.target.dataset.close !== undefined) overlay.remove(); });
    overlay.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => { removeFromPlaylist(btn.dataset.remove); openPlaylistPanel(); });
    });
    const sponsorBtn = overlay.querySelector('#playlist-sponsor-btn');
    if (sponsorBtn) {
      const lines = list.map(it => `• ${TYPE_LABEL[it.type] || it.type}: ${it.title}`).join('\n');
      sponsorBtn.href = waLink(`Hi! I'd like to sponsor these from JTKiaz App:\n${lines}\n\n`);
    }
    document.body.appendChild(overlay);
  }
  if (playlistBtnEl) playlistBtnEl.addEventListener('click', openPlaylistPanel);

  // =========================================================
  // FAVORITES — a personal, cross-content shortlist (README §19).
  // Distinct from the sponsor "playlist" (🎵, above) and the music
  // queue (§7.2) — this is simply "things to come back to": quotes,
  // poems, books, chapters, or songs, all in one place, in whatever
  // order they were added. Stored locally on the reader's device;
  // doesn't touch or interfere with either of those other two.
  // =========================================================
  const FAVORITES_KEY = 'jtkiaz_favorites_v1';
  function getFavorites() {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; } catch (e) { return []; }
  }
  function saveFavorites(list) {
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(list)); } catch (e) { /* ignore */ }
    updateFavoritesBadge();
  }
  function favoritesKey(type, id) { return `${type}:${id}`; }
  function isFavorite(type, id) { return getFavorites().some(it => it.key === favoritesKey(type, id)); }
  function toggleFavorite(type, id, title, subtitle) {
    const list = getFavorites();
    const key = favoritesKey(type, id);
    const idx = list.findIndex(it => it.key === key);
    if (idx === -1) {
      list.push({ key, type, id, title, subtitle: subtitle || '', addedAt: Date.now() });
      saveFavorites(list);
      showToast('❤ Added to Favorites');
    } else {
      list.splice(idx, 1);
      saveFavorites(list);
      showToast('Removed from Favorites');
    }
    const nowActive = isFavorite(type, id);
    document.querySelectorAll(`[data-fav-key="${key}"]`).forEach(btn => {
      btn.classList.toggle('active', nowActive);
      btn.textContent = nowActive ? '❤' : '♡';
      btn.setAttribute('aria-pressed', String(nowActive));
      btn.setAttribute('aria-label', nowActive ? 'Remove from Favorites' : 'Add to Favorites');
    });
    if (document.querySelector('.favorites-overlay')) openFavoritesPanel();
  }
  // Heart toggle — usable on any card/row/detail page across the app.
  function favBtnHTML(type, id, title, subtitle) {
    const key = favoritesKey(type, id);
    const active = isFavorite(type, id);
    return `<button class="fav-btn ${active ? 'active' : ''}" data-fav-key="${esc(key)}" data-fav-type="${esc(type)}" data-fav-id="${esc(id)}" data-fav-title="${esc(title)}" data-fav-subtitle="${esc(subtitle || '')}" aria-pressed="${active}" aria-label="${active ? 'Remove from Favorites' : 'Add to Favorites'}">${active ? '❤' : '♡'}</button>`;
  }
  // Corner variant for grid/thumbnail cards (poem/track/book covers) —
  // same button, absolutely positioned in the artwork's top-right.
  function favBtnCornerHTML(type, id, title, subtitle) {
    const key = favoritesKey(type, id);
    const active = isFavorite(type, id);
    return `<button class="fav-btn fav-btn-corner ${active ? 'active' : ''}" data-fav-key="${esc(key)}" data-fav-type="${esc(type)}" data-fav-id="${esc(id)}" data-fav-title="${esc(title)}" data-fav-subtitle="${esc(subtitle || '')}" aria-pressed="${active}" aria-label="${active ? 'Remove from Favorites' : 'Add to Favorites'}">${active ? '❤' : '♡'}</button>`;
  }
  function wireFavButtons(container) {
    (container || document).querySelectorAll('.fav-btn').forEach(btn => {
      if (btn._favWired) return;
      btn._favWired = true;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(btn.dataset.favType, btn.dataset.favId, btn.dataset.favTitle, btn.dataset.favSubtitle);
      });
    });
  }
  function updateFavoritesBadge() {
    const el = document.getElementById('favorites-count');
    if (!el) return;
    const n = getFavorites().length;
    el.textContent = n;
    el.hidden = n === 0;
  }
  const FAV_TYPE_LABEL = { book: 'Book', chapter: 'Chapter', poem: 'Poem', quote: 'Quote', track: 'Song', blog: 'Blog post' };
  const FAV_TYPE_TAB = { book: 'books', chapter: 'books', poem: 'poems', quote: 'quotes', track: 'music', blog: 'blog' };
  // chapter favorites store id as "<bookId>:<chapterNumber>" — split back
  // out to a real books/<id>/<num> deep link. Quotes and tracks don't have
  // their own detail page (they live inside the Quotes grid / the player),
  // so those resolve differently below.
  function favoritesTargetPath(fav) {
    if (fav.type === 'chapter') {
      const sep = fav.id.indexOf(':');
      return `books/${fav.id.slice(0, sep)}/${fav.id.slice(sep + 1)}`;
    }
    if (fav.type === 'quote') return 'quotes';
    return `${FAV_TYPE_TAB[fav.type]}/${fav.id}`;
  }
  function openFavoritesPanel() {
    var _favOverlay = document.querySelector('.favorites-overlay'); if (_favOverlay) _favOverlay.remove();
    var _plOverlay2 = document.querySelector('.playlist-overlay'); if (_plOverlay2) _plOverlay2.remove();
    const list = getFavorites().slice().sort((a, b) => b.addedAt - a.addedAt);
    const groups = {};
    list.forEach(it => { (groups[it.type] = groups[it.type] || []).push(it); });
    const order = ['book', 'chapter', 'poem', 'quote', 'track', 'blog'];
    const overlay = document.createElement('div');
    overlay.className = 'favorites-overlay';
    overlay.innerHTML = `
      <div class="favorites-panel">
        <div class="favorites-head">
          <h3>❤ Your Favorites</h3>
          <span class="modal-close" data-close>✕ Close</span>
        </div>
        <p class="favorites-sub">Quotes, poems, books, chapters and songs you've hearted — tap any one to jump straight back to it (a favorited song starts playing right away). Nothing here is sent anywhere; it's just for you.</p>
        <div class="favorites-items">
          ${list.length ? order.filter(t => groups[t]).map(t => `
            <div class="favorites-group">
              <div class="favorites-group-label">${esc(FAV_TYPE_LABEL[t])}${groups[t].length > 1 ? 's' : ''} (${groups[t].length})</div>
              ${groups[t].map(it => `
                <div class="favorites-item" ${it.type === 'track' ? `data-play-fav-track="${esc(it.id)}"` : `data-open="${esc(favoritesTargetPath(it))}"`}>
                  <div>
                    <strong>${esc(it.title)}</strong>
                    ${it.subtitle ? `<span class="favorites-item-sub">${esc(it.subtitle)}</span>` : ''}
                  </div>
                  <button class="favorites-remove" data-remove="${esc(it.key)}" aria-label="Remove from Favorites">✕</button>
                </div>
              `).join('')}
            </div>
          `).join('') : `<div class="empty-state">Nothing yet — tap the ♡ on any quote, poem, book, chapter or song to save it here.</div>`}
        </div>
      </div>
    `;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.dataset.close !== undefined) { overlay.remove(); return; }
      if (e.target.closest('.favorites-remove')) return;
      const playItem = e.target.closest('[data-play-fav-track]');
      if (playItem) { overlay.remove(); playTrackNow(playItem.dataset.playFavTrack); return; }
      const item = e.target.closest('[data-open]');
      if (item) { overlay.remove(); navigate(item.dataset.open); }
    });
    overlay.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        saveFavorites(getFavorites().filter(it => it.key !== btn.dataset.remove));
        openFavoritesPanel();
      });
    });
    document.body.appendChild(overlay);
  }
  // Built with JS (like the player dock) rather than editing index.html —
  // sits right before the sponsor-playlist button in the header.
  function ensureFavoritesButton() {
    if (document.getElementById('favorites-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'favorites-btn';
    btn.id = 'favorites-btn';
    btn.setAttribute('aria-label', 'Open your Favorites');
    btn.innerHTML = `♡<span class="favorites-badge" id="favorites-count" hidden>0</span>`;
    btn.addEventListener('click', openFavoritesPanel);
    const anchor = playlistBtnEl || document.getElementById('hamburger');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(btn, anchor);
    updateFavoritesBadge();
  }

  // ---------------- dynamic Google Font loader (per-book/per-poem fonts) ----------------
  const loadedFonts = new Set(['Fraunces', 'Work Sans', 'IBM Plex Mono']);
  function ensureFont(name) {
    if (!name || loadedFonts.has(name)) return;
    loadedFonts.add(name);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(link);
  }

  // ---------------- CountAPI helpers (real, shared view/like counters — see README §14) ----------------
  async function countHit(key) {
    try {
      const res = await fetch(`https://api.countapi.xyz/hit/${COUNTAPI_NAMESPACE}/${encodeURIComponent(key)}`);
      const data = await res.json();
      return typeof data.value === 'number' ? data.value : null;
    } catch (e) { return null; }
  }
  async function countGet(key) {
    try {
      const res = await fetch(`https://api.countapi.xyz/get/${COUNTAPI_NAMESPACE}/${encodeURIComponent(key)}`);
      const data = await res.json();
      return typeof data.value === 'number' ? data.value : 0;
    } catch (e) { return null; }
  }

  // ---------------- helpers ----------------
  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, s => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[s]));
  }
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }
  function findBook(id) { return DATA.books.find(b => b.id === id); }
  function findPoem(id) { return DATA.poems.find(p => p.id === id); }
  function findBlog(id) { return DATA.blog.find(b => b.id === id); }
  function coverSrc(path) { return path ? `assets/images/${path}` : ''; }
  function estReadMinutes(words) { return Math.max(1, Math.round((words || 0) / 200)); }

  // Fisher-Yates — used to keep long poem/track lists from always showing
  // the same items first (README §5.1). Never mutates the input array.
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // A poem's card/hero image: its own `image` column if set, otherwise the
  // default cover for its collection (POEM_COLLECTION_IMAGES), otherwise a
  // generic fallback — see README §21.
  function poemImageFor(p) {
    const key = String((p && p.collection) || '').trim().toLowerCase();
    const rel = (p && p.image) || POEM_COLLECTION_IMAGES[key] || POEM_IMAGE_FALLBACK;
    return coverSrc(rel);
  }
  // A track's artwork: its own `artwork` column, else a shared image for
  // its `type` (MUSIC_TYPE_IMAGES), else the generic fallback.
  function trackImageFor(t) {
    const key = String((t && t.type) || '').trim().toLowerCase();
    const rel = (t && t.artwork) || MUSIC_TYPE_IMAGES[key] || MUSIC_ARTWORK_FALLBACK;
    return coverSrc(rel);
  }

  // ---------------- grid / list view toggle — Poems & Books (§4/§5) ----------------
  const VIEW_MODE_KEY = 'jtkiaz_view_mode_v1';
  const VIEW_MODE_DEFAULTS = { poems: 'grid', books: 'grid', music: 'list', quotes: 'grid', blog: 'list' };
  function getViewModes() {
    try { return Object.assign({}, VIEW_MODE_DEFAULTS, JSON.parse(localStorage.getItem(VIEW_MODE_KEY))); }
    catch (e) { return Object.assign({}, VIEW_MODE_DEFAULTS); }
  }
  function setViewMode(section, mode) {
    const m = getViewModes();
    m[section] = mode;
    try { localStorage.setItem(VIEW_MODE_KEY, JSON.stringify(m)); } catch (e) { /* ignore */ }
  }
  function viewToggleHTML(section) {
    const mode = getViewModes()[section] || 'grid';
    return `
      <div class="view-toggle" role="group" aria-label="Layout">
        <button data-view="grid" class="${mode === 'grid' ? 'active' : ''}" aria-label="Grid view">▦ Grid</button>
        <button data-view="list" class="${mode === 'list' ? 'active' : ''}" aria-label="List view">☰ List</button>
      </div>
    `;
  }
  function wireViewToggle(container, section, rerender) {
    container.querySelectorAll('.view-toggle [data-view]').forEach(btn => {
      btn.addEventListener('click', () => { setViewMode(section, btn.dataset.view); rerender(); });
    });
  }

  // ---------------- router ----------------
  function parseHash() {
    const h = (location.hash || '#/').replace(/^#\/?/, '');
    return h.split('/').filter(Boolean);
  }
  function navigate(path) { location.hash = path; }
  window.jtkiazNav = navigate; // used by inline onclick in rendered markup

  function render() {
    const parts = parseHash();
    const section = parts[0] || 'home';
    setActiveTab(section);
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    updateScrollProgress();

    // Safety net: if a tab's render throws for any reason (bad data row,
    // a third-party embed misbehaving, etc.), show a plain message with a
    // way back instead of silently leaving the screen blank — that "blank
    // screen, no error" state is the hardest kind of bug to describe or
    // diagnose, so this turns it into something visible and recoverable.
    try {
      if (section === 'home') { updateFooterCta('home'); return renderHome(); }
      if (section === 'books') { return parts[1] ? renderBookDetail(parts[1], parts[2]) : (updateFooterCta('books'), renderBooks()); }
      if (section === 'poems') { return parts[1] ? renderPoemDetail(parts[1]) : (updateFooterCta('poems'), renderPoems()); }
      if (section === 'quotes') { return parts[1] ? renderQuoteDetail(parts[1]) : (updateFooterCta('quotes'), renderQuotes()); }
      if (section === 'music') { updateFooterCta('music'); return renderMusic(); }
      if (section === 'blog') { return parts[1] ? renderBlogDetail(parts[1]) : (updateFooterCta('blog'), renderBlog()); }
      updateFooterCta('home');
      return renderHome();
    } catch (err) {
      console.error('Render failed for section "' + section + '":', err);
      root.innerHTML = `
        <div class="wrap view">
          <div class="empty-state">
            <p>This page hit a snag loading (${esc(section)}).</p>
            <p style="font-family:var(--font-mono);font-size:0.78rem;color:var(--brown-soft)">${esc(err && err.message ? err.message : String(err))}</p>
            <button class="btn" onclick="jtkiazNav('/')">← Back to Home</button>
          </div>
        </div>
      `;
    }
  }
  window.addEventListener('hashchange', render);

  function setActiveTab(section) {
    tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === section));
  }

  // ---------------- scroll progress bar ----------------
  function updateScrollProgress() {
    if (!scrollProgressEl) return;
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - doc.clientHeight;
    const pct = scrollable > 0 ? Math.min(100, (doc.scrollTop / scrollable) * 100) : 0;
    scrollProgressEl.style.width = pct + '%';
  }
  window.addEventListener('scroll', updateScrollProgress, { passive: true });

  // ---------------- footer CTA (subtle-but-gleaming, per-tab support pitch) ----------------
  function waLink(message) {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }
  function updateFooterCta(section, item) {
    if (!footerCtaTextEl || !footerCtaBtnEl) return;
    const pitches = {
      home: ['Enjoying the studio? <strong>Support Hippy Vibes</strong> directly.', 'Hi! I love what you\'re building at Hippy Vibes Studio 🙏'],
      books: ['Support a book — every read keeps new chapters coming.', 'Hi! I\'d like to support a book on JTKiaz App 🙏'],
      poems: ['Moved by a poem? <strong>Sponsor a collection.</strong>', 'Hi! I\'d like to support the poetry on JTKiaz App 🙏'],
      quotes: ['Support the studio behind these words.', 'Hi! I\'d like to support JTKiaz App 🙏'],
      music: ['Support a track — spoken word takes time to make.', 'Hi! I\'d like to support the music on JTKiaz App 🙏'],
      blog: ['Enjoy the blog? Support the studio.', 'Hi! I\'d like to support Hippy Vibes Studio 🙏']
    };
    let [html, msg] = pitches[section] || pitches.home;
    if (item) {
      html = `Enjoying <strong>${esc(item)}</strong>? Support it directly.`;
      msg = `Hi! I'd like to support "${item}" on JTKiaz App 🙏`;
    }
    footerCtaTextEl.innerHTML = html;
    footerCtaBtnEl.href = waLink(msg);
  }

  // ---------------- fullscreen reading mode ----------------
  function toggleFullscreen() {
    const el = document.documentElement;
    if (document.fullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen();
      document.body.classList.remove('reading-fullscreen');
      return;
    }
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
      document.body.classList.add('reading-fullscreen');
    } else {
      // iOS Safari and others without the Fullscreen API: fall back to a
      // full-viewport reading mode using CSS only.
      document.body.classList.toggle('reading-fullscreen');
    }
  }
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) document.body.classList.remove('reading-fullscreen');
  });

  // ---------------- reader toolbar (font size + fullscreen) ----------------
  function readerToolbarHTML() {
    return `
      <div class="reader-toolbar">
        <div class="rt-group">
          <span class="rt-label">Text size</span>
          <button data-rt="smaller" aria-label="Decrease text size">A−</button>
          <button data-rt="reset" aria-label="Reset text size">A</button>
          <button data-rt="bigger" aria-label="Increase text size">A+</button>
        </div>
        <div class="rt-group">
          <button data-rt="fullscreen">⤢ Fullscreen</button>
        </div>
      </div>
    `;
  }
  function wireReaderToolbar(container) {
    const bar = container.querySelector('.reader-toolbar');
    if (!bar) return;
    bar.querySelector('[data-rt="smaller"]').addEventListener('click', () => setFontScale(getFontScale() - FONT_STEP));
    bar.querySelector('[data-rt="bigger"]').addEventListener('click', () => setFontScale(getFontScale() + FONT_STEP));
    bar.querySelector('[data-rt="reset"]').addEventListener('click', () => setFontScale(1));
    bar.querySelector('[data-rt="fullscreen"]').addEventListener('click', toggleFullscreen);
  }

  // ---------------- engagement bar (like / share / comment) ----------------
  // Views and likes are still tallied on the backend (CountAPI, keyed by
  // COUNTAPI_NAMESPACE — see README §8.10 and §14), but the running totals
  // are no longer shown to readers. Nothing here updates in real time in
  // front of a visitor; you check the numbers yourself on admin-stats.html
  // (README §14.1) whenever you want to see how a piece is doing.
  function engageBarHTML(type, id, title) {
    return `
      <div class="engage-bar" data-engage-type="${esc(type)}" data-engage-id="${esc(id)}" data-engage-title="${esc(title)}">
        <button class="like-btn" data-role="like">❤ Like</button>
        <a class="comment-cta" data-role="comment" href="#" target="_blank" rel="noopener">💬 Comment via WhatsApp</a>
        <div class="share-row" data-role="share">
          <span class="share-label">Share:</span>
          <button data-share="whatsapp" aria-label="Share on WhatsApp">WhatsApp</button>
          <button data-share="twitter" aria-label="Share on X">X</button>
          <button data-share="facebook" aria-label="Share on Facebook">Facebook</button>
          <button data-share="copy" aria-label="Copy link">Copy link</button>
          <button data-share="native" hidden>Share</button>
        </div>
      </div>
    `;
  }
  function wireEngageBar(container) {
    const bar = container.querySelector('.engage-bar');
    if (!bar) return;
    const type = bar.dataset.engageType, id = bar.dataset.engageId, title = bar.dataset.engageTitle;
    const key = `${type}:${id}`;
    const url = location.href;
    const liked = getLiked();

    // record a view in the background — never shown to the reader
    countHit(`view:${key}`);
    if (liked[key]) {
      const likeBtn = bar.querySelector('[data-role="like"]');
      likeBtn.classList.add('liked');
      likeBtn.textContent = '❤ Liked';
    }

    bar.querySelector('[data-role="like"]').addEventListener('click', async () => {
      const likeBtn = bar.querySelector('[data-role="like"]');
      if (getLiked()[key]) { showToast('Already sent your love on this one'); return; }
      await countHit(`like:${key}`); // tallied privately — no count shown here
      markLiked(key);
      likeBtn.classList.add('liked');
      likeBtn.textContent = '❤ Liked';
      showToast('❤ Thank you');
    });

    bar.querySelector('[data-role="comment"]').href = waLink(`Hi! I wanted to comment on "${title}" on JTKiaz App: `);

    bar.querySelectorAll('[data-share]').forEach(btn => {
      const kind = btn.dataset.share;
      if (kind === 'native') {
        if (navigator.share) { btn.hidden = false; btn.addEventListener('click', () => navigator.share({ title, url }).catch(() => {})); }
        return;
      }
      btn.addEventListener('click', () => {
        if (kind === 'copy') {
          if (navigator.clipboard) { navigator.clipboard.writeText(url).then(() => showToast('Link copied')).catch(() => showToast('Could not copy')); }
          return;
        }
        const shareUrls = {
          whatsapp: `https://wa.me/?text=${encodeURIComponent(title + ' — ' + url)}`,
          twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        };
        window.open(shareUrls[kind], '_blank', 'noopener,width=560,height=560');
      });
    });
  }

  // ---------------- lightweight text formatting (README §8.9.1) ----------------
  // A tiny, safe markup for content typed straight into the workbook —
  // no HTML allowed (everything is escaped first), just a few plain-text
  // conventions so long text can be spaced and styled on the page:
  //   blank line          -> new paragraph
  //   single line break   -> line break within a paragraph
  //   **bold**             -> bold
  //   *italic*             -> italic
  //   # A short heading    -> a small heading inside the text (own line)
  //   ---  (own line)      -> a centered scene/section break
  function inlineFormat(escapedStr) {
    return escapedStr
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }
  function formatBodyText(raw) {
    const blocks = String(raw == null ? '' : raw).split(/\n[ \t]*\n+/);
    return blocks.map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (/^-{3,}$/.test(trimmed)) return `<div class="scene-break" aria-hidden="true">◆ ◆ ◆</div>`;
      const heading = trimmed.match(/^#\s+(.+)$/);
      if (heading) return `<h3 class="body-heading">${inlineFormat(esc(heading[1]))}</h3>`;
      const lines = trimmed.split('\n').map(l => inlineFormat(esc(l)));
      return `<p>${lines.join('<br>')}</p>`;
    }).join('');
  }
  // poems keep every line break meaningful (verse), so only bold/italic apply
  function formatPoemText(raw) { return inlineFormat(esc(raw)); }

  // ---------------- inline text popups (image / audio / video / link within reading text) ----------------
  let POPUP_REGISTRY = {};
  function renderTextWithPopups(escapedContent, popups, keyPrefix) {
    if (!popups || !popups.length) return escapedContent;
    return escapedContent.replace(/\{\{pop:([a-zA-Z0-9_-]+)\}\}/g, (m, id) => {
      const popup = popups.find(p => p.id === id);
      if (!popup) return '';
      const key = `${keyPrefix}:${id}`;
      POPUP_REGISTRY[key] = popup;
      return `<button class="pop-trigger" data-popup-key="${esc(key)}" aria-label="Open extra: ${esc(popup.caption || id)}">◆</button>`;
    });
  }
  function openPopup(popup) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    let media = '';
    if (popup.image) media += `<img src="${esc(coverSrc(popup.image))}" alt="${esc(popup.caption || '')}" loading="lazy">`;
    if (popup.caption) media += `<figcaption>${esc(popup.caption)}</figcaption>`;
    if (popup.audio) media += `<audio controls preload="none" src="${esc(coverSrc(popup.audio))}"></audio>`;
    if (popup.video) media += `<div class="video-wrap"><iframe src="${esc(popup.video)}" loading="lazy" allow="autoplay; encrypted-media" allowfullscreen></iframe></div>`;
    if (popup.link) media += `<a class="btn accent" href="${esc(popup.link)}" target="_blank" rel="noopener">${esc(popup.linktext || 'Open link')} →</a>`;
    overlay.innerHTML = `<div class="modal-box popup-media"><span class="modal-close" data-close>✕ Close</span>${media}</div>`;
    overlay.addEventListener('click', (e) => { if (e.target === overlay || e.target.dataset.close !== undefined) overlay.remove(); });
    document.body.appendChild(overlay);
  }
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.pop-trigger');
    if (!trigger) return;
    const popup = POPUP_REGISTRY[trigger.dataset.popupKey];
    if (popup) openPopup(popup);
  });

  // ---------------- quick share (book cards, and anywhere else a single ↗ Share button appears) ----------------
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-quick-share]');
    if (!btn) return;
    e.stopPropagation();
    const type = btn.dataset.quickShare, id = btn.dataset.quickShareId, title = btn.dataset.quickShareTitle;
    const url = `${location.origin}${location.pathname}#/${type === 'book' ? 'books' : type}/${id}`;
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {});
      return;
    }
    // no native share sheet (most desktop browsers): open WhatsApp share and copy the link too
    if (navigator.clipboard) { navigator.clipboard.writeText(url).catch(() => {}); }
    window.open(`https://wa.me/?text=${encodeURIComponent(title + ' — ' + url)}`, '_blank', 'noopener,width=560,height=560');
    showToast('Link copied · opening WhatsApp');
  });

  // =========================================================
  // PROMO POPUPS — timed advertising pop-ups (README §17)
  // Editable entirely from the "Promo Popups" tab of the workbook —
  // no code changes needed to add, change or retire one. Every popup
  // always carries a WhatsApp button, as required. Non-blocking: it's
  // a small card in the corner, not a full-screen takeover, and it
  // never appears in fullscreen reading mode or while another popup
  // or modal is already open.
  // =========================================================
  const PROMO_SEEN_KEY = 'jtkiaz_promo_seen_v1';
  function getPromoSeen() {
    try { return JSON.parse(sessionStorage.getItem(PROMO_SEEN_KEY)) || {}; } catch (e) { return {}; }
  }
  function markPromoSeen(id, nextEligible) {
    const seen = getPromoSeen();
    seen[id] = nextEligible;
    try { sessionStorage.setItem(PROMO_SEEN_KEY, JSON.stringify(seen)); } catch (e) { /* ignore */ }
  }
  function currentTabSection() { return (parseHash()[0] || 'home'); }
  let promoPopupOpen = false;
  let promoClock = null;

  function promoLinkNav(popup) {
    if (popup.linkType === 'none' || !popup.linkId) return null;
    if (popup.linkType === 'book') return `books/${popup.linkId}`;
    if (popup.linkType === 'poem') return `poems/${popup.linkId}`;
    if (popup.linkType === 'blog') return `blog/${popup.linkId}`;
    if (popup.linkType === 'track') return 'music'; // tracks don't have their own URL — send them to the Music tab
    return null;
  }

  function showPromoPopup(popup) {
    if (promoPopupOpen) return; // one at a time — never stack
    if (document.body.classList.contains('reading-fullscreen')) return;
    promoPopupOpen = true;

    const card = document.createElement('div');
    card.className = 'promo-popup';
    card.style.setProperty('--book-accent-promo', 'var(--gold)');
    const navTo = promoLinkNav(popup);
    const waMsg = popup.whatsappMessage || `Hi! I saw the "${popup.title}" pop-up on JTKiaz App 🙏`;
    card.innerHTML = `
      <button class="promo-close" aria-label="Close">✕</button>
      ${popup.image ? `<div class="promo-img"><img src="${esc(coverSrc(popup.image))}" alt="${esc(popup.title)}" loading="lazy" onerror="this.parentElement.remove()"></div>` : ''}
      <div class="promo-body">
        <span class="promo-eyebrow">${esc((popup.type || 'general').replace(/_/g, ' '))}</span>
        <h4>${esc(popup.title)}</h4>
        <p>${esc(popup.message)}</p>
        <div class="promo-actions">
          ${navTo ? `<button class="btn ghost" data-promo-nav="${esc(navTo)}">${esc(popup.linkLabel || 'Take a look')}</button>` : ''}
          <a class="btn accent" href="${waLink(waMsg)}" target="_blank" rel="noopener">💛 WhatsApp</a>
        </div>
      </div>
    `;
    document.body.appendChild(card);
    requestAnimationFrame(() => card.classList.add('promo-in'));

    if (popup.sound) {
      try { const snd = new Audio(coverSrc(popup.sound)); snd.volume = 0.5; snd.play().catch(() => {}); } catch (e) { /* ignore */ }
    }

    function close() {
      card.classList.remove('promo-in');
      card.classList.add('promo-out');
      setTimeout(() => card.remove(), 260);
      promoPopupOpen = false;
    }
    card.querySelector('.promo-close').addEventListener('click', close);
    const navBtn = card.querySelector('[data-promo-nav]');
    if (navBtn) navBtn.addEventListener('click', () => { navigate(navBtn.dataset.promoNav); close(); });

    // auto-dismiss so it never lingers and blocks reading
    clearTimeout(showPromoPopup._t);
    showPromoPopup._t = setTimeout(() => { if (document.body.contains(card)) close(); }, 14000);
  }

  function initPromoPopups() {
    const popups = (DATA.promoPopups || []).filter(p => p.title);
    if (!popups.length) return;
    const startedAt = Date.now();
    const state = {}; // id -> { nextEligibleAt (ms since startedAt) }
    popups.forEach(p => { state[p.id] = { nextEligibleAt: p.delaySeconds * 1000 }; });

    promoClock = setInterval(() => {
      if (promoPopupOpen || document.getElementById('whats-new-overlay')) return;
      const elapsed = Date.now() - startedAt;
      const section = currentTabSection();
      for (const p of popups) {
        const s = state[p.id];
        if (!s || elapsed < s.nextEligibleAt) continue;
        const showsHere = p.showOn.includes('all') || p.showOn.includes(section);
        if (!showsHere) continue; // stays eligible, just waiting for the right tab
        showPromoPopup(p);
        if (p.repeatEverySeconds > 0) {
          s.nextEligibleAt = elapsed + p.repeatEverySeconds * 1000;
        } else {
          delete state[p.id];
        }
        break; // only ever trigger one per tick
      }
    }, 4000);
  }

  // ---------------- "What's New" overlay (Music tab only) ----------------
  // A minimizable, closable magazine-style panel that fades in ~15s after
  // you land on the Music tab, spotlighting the newest track plus a
  // handful of the latest books/poems/quotes. Purely informational — no
  // links that navigate away from the music, by design.
  //
  // "Latest" = whichever rows sit closest to the BOTTOM of each tab in
  // the workbook (Books / Poems / Quotes / Music), since that's the
  // order build-data.js preserves into data.js. So as long as new
  // content gets added as new rows at the bottom — which is the natural
  // way to add a row in Excel/Sheets anyway — this list updates itself
  // automatically, with nothing extra to fill in. One real caveat: a
  // multi-part poem (Part 1 / Part 2 / …) always sorts after every
  // standalone poem, regardless of when it was actually added — that's
  // how buildPoems() groups them, so multi-part pieces can look "newer"
  // than they are. Minor edge case, not worth a rebuild to fix.
  //
  // For a more deliberate "newest first" than row order, add a
  // date_added column to the Books/Poems/Quotes/Music tabs and a couple
  // of lines to build-data.js's buildBooks()/buildPoems()/buildQuotes()/
  // buildMusic() to carry it through and sort by it — happy to wire
  // that up on request.
  let whatsNewTimer = null;
  let whatsNewDismissedThisVisit = false;

  function songMetaLineHTML(t) {
    const bits = [
      t.artist ? `<span><strong>Artist:</strong> ${esc(t.artist)}</span>` : '',
      t.producer ? `<span><strong>Producer:</strong> ${esc(t.producer)}</span>` : ''
    ].filter(Boolean).join('');
    return bits ? `<div class="whats-new-meta">${bits}</div>` : '';
  }
  // Song description fields are all optional and none exist yet in your
  // data.js — add any of `artist`, `producer`, `vision`, `about` to a
  // track object and this picks them up with no other change needed.
  // Good things to tag per song for a richer card here: `vision` (the
  // one-line "why this song exists"), `about` (a short story behind it —
  // where/when it was made, who's on it), `mood` (a couple of vibe
  // words — "late-night, reflective"), or `credits` (features, mix/
  // master). Falls back to the existing `description` field alone if
  // none of those are filled in yet.
  function latestSongHTML() {
    const t = DATA.music[DATA.music.length - 1];
    if (!t) return '';
    const img = trackImageFor(t);
    const longText = [
      t.about ? `<p>${esc(t.about)}</p>` : '',
      t.vision ? `<p><strong>The vision:</strong> ${esc(t.vision)}</p>` : '',
      t.mood ? `<p><strong>Mood:</strong> ${esc(t.mood)}</p>` : '',
      (!t.about && !t.vision && t.description) ? `<p>${esc(t.description)}</p>` : ''
    ].filter(Boolean).join('');
    return `
      <div class="whats-new-feature">
        <div class="whats-new-feature-art"><img src="${esc(img)}" alt="" loading="lazy" onerror="this.remove()"></div>
        <div class="whats-new-feature-body">
          <span class="whats-new-eyebrow">🎧 Newest track</span>
          <h4>${esc(t.title)}</h4>
          ${songMetaLineHTML(t)}
          ${longText}
        </div>
      </div>
    `;
  }
  function whatsNewOverlayHTML() {
    const books = DATA.books.slice(-5).reverse();
    const poems = DATA.poems.slice(-10).reverse();
    const quotes = DATA.quotes.slice(-20).reverse();
    const miniCard = (img, label) => `<div class="whats-new-card"><img src="${esc(img)}" alt="" loading="lazy" onerror="this.parentElement.remove()"><span>${esc(label)}</span></div>`;
    const bookStrip = books.map(b => miniCard(coverSrc(b.cover), b.title)).join('');
    const poemStrip = poems.map(p => miniCard(poemImageFor(p), p.title)).join('');
    const quoteStrip = quotes.map(q => `<div class="whats-new-quote">"${esc((q.text || '').slice(0, 90))}${(q.text || '').length > 90 ? '…' : ''}"<em>— ${esc(q.origin || 'Unknown')}</em></div>`).join('');
    const waHref = waLink("Hi! I just saw the latest releases on JTKiaz App and want to know more 🙏");
    return `
      <div class="whats-new-overlay" id="whats-new-overlay">
        <div class="whats-new-panel">
          <div class="whats-new-head">
            <span>✨ New on Hippy Vibes</span>
            <div class="whats-new-head-btns">
              <button type="button" id="whats-new-min" aria-label="Minimize">–</button>
              <button type="button" id="whats-new-close" aria-label="Close">✕</button>
            </div>
          </div>
          <div class="whats-new-scroll">
            ${latestSongHTML()}
            ${books.length ? `<div class="whats-new-section"><h5>📚 New books</h5><div class="whats-new-strip">${bookStrip}</div></div>` : ''}
            ${poems.length ? `<div class="whats-new-section"><h5>🖋️ New poems</h5><div class="whats-new-strip">${poemStrip}</div></div>` : ''}
            ${quotes.length ? `<div class="whats-new-section"><h5>💬 New quotes</h5><div class="whats-new-quotes">${quoteStrip}</div></div>` : ''}
            <div class="whats-new-cta">
              <img class="whats-new-qr" src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(waHref)}" alt="Scan to chat on WhatsApp" loading="lazy" onerror="this.style.display='none'">
              <div class="whats-new-cta-copy">
                <p>Enjoying what's new? Say hi on WhatsApp — sponsor a track, request a poem, or just say you're listening.</p>
                <a class="btn" href="${esc(waHref)}" target="_blank" rel="noopener">💛 Chat on WhatsApp</a>
              </div>
            </div>
          </div>
        </div>
        <button type="button" class="whats-new-pill" id="whats-new-pill" hidden>✨ What's new</button>
      </div>
    `;
  }
  function mountWhatsNewOverlay() {
    if (document.getElementById('whats-new-overlay')) return;
    const holder = document.createElement('div');
    holder.innerHTML = whatsNewOverlayHTML().trim();
    const overlay = holder.firstElementChild;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('whats-new-in'));
    const panel = overlay.querySelector('.whats-new-panel');
    const pill = overlay.querySelector('#whats-new-pill');
    function dismissForVisit() {
      whatsNewDismissedThisVisit = true;
      overlay.classList.remove('whats-new-in');
      setTimeout(() => overlay.remove(), 260);
    }
    overlay.querySelector('#whats-new-close').addEventListener('click', dismissForVisit);
    overlay.querySelector('#whats-new-min').addEventListener('click', () => { panel.hidden = true; pill.hidden = false; });
    pill.addEventListener('click', () => { panel.hidden = false; pill.hidden = true; });
  }
  // Called every time the Music tab renders. Only actually schedules
  // once per visit to the app — switching away and back to Music (or a
  // re-render from something else) won't stack up duplicate timers or
  // re-show something you already closed.
  function scheduleWhatsNewOverlay() {
    clearTimeout(whatsNewTimer);
    if (whatsNewDismissedThisVisit || document.getElementById('whats-new-overlay')) return;
    whatsNewTimer = setTimeout(() => {
      if (currentTabSection() !== 'music') return; // moved on already — don't pop up elsewhere
      mountWhatsNewOverlay();
    }, 15000);
  }

  // =========================================================
  // PLAYER — one persistent "Now Playing" bar + queue, living outside
  // #view-root so it survives every tab change (README §7). Handles two
  // kinds of tracks:
  //   - self-hosted (source=local): a real <audio> element — full
  //     play/pause/seek/next/prev, works completely in the background.
  //   - Audiomack/SoundCloud embeds (source=audiomack/soundcloud): ONE
  //     persistent iframe that is never destroyed/recreated when you
  //     switch tabs — only its `src` changes between tracks. Play/pause
  //     for these lives inside the embed's own UI (a restriction of
  //     third-party embeds, not this app) — but the player itself, and
  //     whatever is already playing inside it, is never torn down just
  //     because you tapped over to Books or Poems.
  // =========================================================
  const QUEUE_KEY = 'jtkiaz_queue_v1';
  const Player = { ids: [], index: -1, audio: null, dockEl: null, mounted: false };

  function findTrack(id) { return DATA.music.find(t => t.id === id); }

  // A track's `src` counts as "not set yet" if it's empty, starts with the
  // README's PASTE_ placeholder, or still contains the ENCODED_TRACK_URL
  // placeholder text (a row that was never finished) — catching this stops
  // a broken/unencoded URL from ever reaching an <iframe src>.
  function isPlaceholderSrc(src) {
    if (!src) return true;
    const s = String(src).trim();
    if (!s) return true;
    if (s.indexOf('PASTE_') === 0) return true;
    if (s.indexOf('ENCODED_TRACK_URL') !== -1) return true;
    return false;
  }
  // Builds a working SoundCloud widget iframe src from either:
  //  a) a full widget URL already (https://w.soundcloud.com/player/?url=...
  //     — what SoundCloud's own "Embed" panel gives you), used as-is, or
  //  b) a plain track/set page link (https://soundcloud.com/you/track or
  //     the short https://on.soundcloud.com/xxxx form) — auto-wrapped into
  //     a widget URL, share params like ?si=... stripped first.
  // Either way, auto_play is forced to match what's actually happening
  // right now (autoplay when a track is opened in the player, off when
  // just previewing) instead of trusting whatever was pasted in.
  function soundcloudEmbedSrc(raw, autoplay) {
    if (!raw) return '';
    let widgetUrl = raw.indexOf('w.soundcloud.com/player') !== -1
      ? raw
      : `https://w.soundcloud.com/player/?url=${encodeURIComponent(raw.split('?')[0].replace(/\/$/, ''))}&color=%23C79A49&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false`;
    widgetUrl = /([?&])auto_play=(true|false)/.test(widgetUrl)
      ? widgetUrl.replace(/([?&])auto_play=(true|false)/, `$1auto_play=${autoplay ? 'true' : 'false'}`)
      : widgetUrl + (widgetUrl.indexOf('?') === -1 ? '?' : '&') + 'auto_play=' + (autoplay ? 'true' : 'false');
    return widgetUrl;
  }
  function audiomackEmbedSrc(raw, autoplay) {
    if (!raw) return '';
    const joiner = raw.indexOf('?') === -1 ? '?' : '&';
    return raw + joiner + 'autoplay=' + (autoplay ? 'true' : 'false');
  }
  // Glows the track card/row currently loaded in the persistent player so
  // it's obvious which one is playing even while browsing the rest of the
  // grid. Safe to call from any tab — it's a no-op if the Music tab isn't
  // the one currently on screen (querySelectorAll just finds nothing).
  function markNowPlayingInView() {
    const track = currentTrack();
    document.querySelectorAll('.track-card[data-play-track], .track-row-top[data-play-track]').forEach(el => {
      el.classList.toggle('now-playing', !!track && el.dataset.playTrack === track.id);
    });
  }
  // Small "not set up yet" note shown in place of a broken/blank player —
  // never shown for a track that has a real, working link.
  function trackMissingEmbedNoteHTML(t) {
    if (t.source === 'local') return '';
    if (!isPlaceholderSrc(t.src)) return '';
    return `<div class="track-fallback">No embed URL set yet for "${esc(t.title)}". See README → Music tab for how to paste a SoundCloud/Audiomack link here.</div>`;
  }
  function loadQueueFromStorage() {
    try {
      const saved = JSON.parse(localStorage.getItem(QUEUE_KEY));
      if (saved && Array.isArray(saved.ids)) {
        Player.ids = saved.ids.filter(id => findTrack(id));
        Player.index = Number.isInteger(saved.index) ? saved.index : (Player.ids.length ? 0 : -1);
        if (Player.index >= Player.ids.length) Player.index = Player.ids.length - 1;
      }
    } catch (e) { /* ignore */ }
  }
  function saveQueueToStorage() {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify({ ids: Player.ids, index: Player.index })); } catch (e) { /* ignore */ }
  }
  function currentTrack() {
    return Player.index >= 0 && Player.index < Player.ids.length ? findTrack(Player.ids[Player.index]) : null;
  }
  function queueTracks() { return Player.ids.map(findTrack).filter(Boolean); }

  // "+ Queue" — add to the end without interrupting whatever's playing.
  function queueAdd(id, opts) {
    opts = opts || {};
    if (!findTrack(id)) return;
    const already = Player.ids.indexOf(id);
    if (already === -1) Player.ids.push(id);
    saveQueueToStorage();
    if (opts.playNow) { playAt(already === -1 ? Player.ids.length - 1 : already); }
    else {
      ensurePlayerDock();
      renderPlayerDock();
      showToast(already === -1 ? '✓ Added to queue' : 'Already in your queue');
    }
  }
  // "▶ Play" on a track card — quick-plays it now.
  function playTrackNow(id) { queueAdd(id, { playNow: true }); }
  // "▶ Play all" / "🔀 Shuffle play" on the Music tab header.
  function setQueue(ids, startIndex) {
    Player.ids = ids.slice();
    saveQueueToStorage();
    playAt(startIndex || 0);
  }
  function queueRemove(id) {
    const idx = Player.ids.indexOf(id);
    if (idx === -1) return;
    Player.ids.splice(idx, 1);
    if (idx < Player.index) { Player.index -= 1; }
    else if (idx === Player.index) {
      if (!Player.ids.length) { stopPlayer(); return; }
      Player.index = Math.min(Player.index, Player.ids.length - 1);
      saveQueueToStorage();
      loadCurrent(true);
      return;
    }
    saveQueueToStorage();
    renderPlayerDock();
  }
  function queueMove(id, direction) {
    const idx = Player.ids.indexOf(id);
    if (idx === -1) return;
    const swapWith = direction === 'up' ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= Player.ids.length) return;
    const tmp = Player.ids[idx]; Player.ids[idx] = Player.ids[swapWith]; Player.ids[swapWith] = tmp;
    if (Player.index === idx) Player.index = swapWith;
    else if (Player.index === swapWith) Player.index = idx;
    saveQueueToStorage();
    renderPlayerDock();
  }
  function playAt(index) {
    if (index < 0 || index >= Player.ids.length) return;
    const isFirstPlayThisSession = !Player.mounted;
    Player.index = index;
    saveQueueToStorage();
    loadCurrent(true);
    // Auto-open the rich player panel the FIRST time something starts
    // playing, so the actual embed is visible right away with no extra
    // tap. It lives in the persistent dock (outside #view-root, see the
    // block comment above), so unlike an iframe embedded directly in a
    // tab's markup, it's never destroyed when you switch tabs, and the
    // track keeps playing right there. On later skips/next-track we leave
    // it as the user left it (collapsed or expanded) instead of forcing
    // it back open every time.
    if (isFirstPlayThisSession) expandPlayer();
  }
  function playNextTrack() { if (Player.ids.length) playAt((Player.index + 1) % Player.ids.length); }
  function playPrevTrack() { if (Player.ids.length) playAt((Player.index - 1 + Player.ids.length) % Player.ids.length); }
  function stopPlayer() {
    if (Player.audio) Player.audio.pause();
    Player.ids = []; Player.index = -1;
    saveQueueToStorage();
    if (Player.dockEl) { Player.dockEl.remove(); Player.dockEl = null; Player.mounted = false; }
    document.body.classList.remove('has-player', 'player-expanded-open');
    markNowPlayingInView();
  }
  function loadCurrent(autoplay) {
    const track = currentTrack();
    ensurePlayerDock();
    if (!track) { renderPlayerDock(); return; }
    if (track.source === 'local' && track.src) {
      if (!Player.audio) {
        Player.audio = new Audio();
        Player.audio.volume = 0.9;
        Player.audio.addEventListener('play', renderPlayerDock);
        Player.audio.addEventListener('pause', renderPlayerDock);
        Player.audio.addEventListener('ended', playNextTrack);
        Player.audio.addEventListener('timeupdate', updatePlayerProgress);
      }
      let sameSrc = false;
      try { sameSrc = Player.audio.src === new URL(track.src, window.location.href).href; } catch (e) { /* relative path fallback */ }
      if (!sameSrc) Player.audio.src = track.src;
      if (autoplay) Player.audio.play().catch(() => showToast('Tap ▶ to start the track'));
    } else if (Player.audio) {
      Player.audio.pause();
    }
    renderPlayerDock();
  }
  function togglePlayback() {
    const track = currentTrack();
    if (!track) return;
    if (track.source === 'local' && Player.audio) {
      if (Player.audio.paused) Player.audio.play().catch(() => {});
      else Player.audio.pause();
    } else {
      showToast('Use ▶ inside the player — embedded tracks control their own playback');
    }
  }
  function expandPlayer() {
    if (!Player.dockEl) return;
    Player.dockEl.classList.add('expanded');
    document.body.classList.add('player-expanded-open');
  }
  function collapsePlayer() {
    if (!Player.dockEl) return;
    Player.dockEl.classList.remove('expanded');
    document.body.classList.remove('player-expanded-open');
  }
  function ensurePlayerDock() {
    if (Player.mounted) return;
    const dock = document.createElement('div');
    dock.className = 'player-dock';
    dock.innerHTML = `
      <div class="player-mini">
        <div class="player-progress"><div class="player-progress-fill" id="player-progress-fill"></div></div>
        <button class="player-mini-art" id="player-mini-art" aria-label="Expand player"></button>
        <div class="player-mini-info" id="player-mini-expand-target">
          <strong id="player-mini-title">Nothing queued</strong>
          <span id="player-mini-sub">Tap a song to start</span>
        </div>
        <div class="player-mini-controls">
          <button data-role="prev" aria-label="Previous track">⏮</button>
          <button data-role="toggle" aria-label="Play or pause">▶</button>
          <button data-role="next" aria-label="Next track">⏭</button>
          <button data-role="expand" aria-label="Expand player">︿</button>
        </div>
      </div>
      <div class="player-expanded">
        <div class="player-expanded-head">
          <button class="ghost-btn" data-role="collapse">﹀ Minimize</button>
          <button class="ghost-btn" data-role="stop">✕ Close player</button>
        </div>
        <div class="player-now">
          <div class="player-now-art" id="player-now-art"></div>
          <div class="player-now-info">
            <span class="player-now-type" id="player-now-type"></span>
            <h3 id="player-now-title"></h3>
            <p id="player-now-desc"></p>
          </div>
          <button class="fav-btn player-now-fav" id="player-now-fav" aria-label="Add to Favorites">♡</button>
        </div>
        <div class="player-surface" id="player-surface"></div>
        <div class="player-transport">
          <button data-role="prev2">⏮ Prev</button>
          <button data-role="toggle2">▶ Play</button>
          <button data-role="next2">Next ⏭</button>
        </div>
        <div class="player-queue">
          <div class="player-queue-head">🎶 Up next — drag order with ↑↓, tap ✕ to remove</div>
          <div class="player-queue-list" id="player-queue-list"></div>
        </div>
      </div>
    `;
    document.body.appendChild(dock);
    Player.dockEl = dock;
    Player.mounted = true;
    document.body.classList.add('has-player');

    dock.querySelectorAll('[data-role="prev"], [data-role="prev2"]').forEach(b => b.addEventListener('click', playPrevTrack));
    dock.querySelectorAll('[data-role="next"], [data-role="next2"]').forEach(b => b.addEventListener('click', playNextTrack));
    dock.querySelectorAll('[data-role="toggle"], [data-role="toggle2"]').forEach(b => b.addEventListener('click', togglePlayback));
    dock.querySelector('[data-role="expand"]').addEventListener('click', expandPlayer);
    dock.querySelector('#player-mini-art').addEventListener('click', expandPlayer);
    dock.querySelector('#player-mini-expand-target').addEventListener('click', expandPlayer);
    dock.querySelector('[data-role="collapse"]').addEventListener('click', collapsePlayer);
    dock.querySelector('[data-role="stop"]').addEventListener('click', stopPlayer);
    dock.querySelector('#player-now-fav').addEventListener('click', (e) => {
      e.stopPropagation();
      const t = currentTrack();
      if (!t) return;
      toggleFavorite('track', t.id, t.title, t.type);
      const isFav = isFavorite('track', t.id);
      const favBtn = dock.querySelector('#player-now-fav');
      favBtn.textContent = isFav ? '❤' : '♡';
      favBtn.classList.toggle('active', isFav);
      favBtn.setAttribute('aria-pressed', String(isFav));
    });
  }
  function updateToggleIcons(playing) {
    if (!Player.dockEl) return;
    Player.dockEl.querySelectorAll('[data-role="toggle"]').forEach(b => b.textContent = playing ? '⏸' : '▶');
    const t2 = Player.dockEl.querySelector('[data-role="toggle2"]');
    if (t2) t2.textContent = playing ? '⏸ Pause' : '▶ Play';
  }
  function mountPlayerSurface(track) {
    const surface = Player.dockEl.querySelector('#player-surface');
    if (track.source === 'local' && track.src) {
      surface.innerHTML = `<div class="player-surface-note">Playing right in the app — use the controls below. Keeps playing while you browse other tabs.</div>`;
    } else if (track.source === 'soundcloud' && !isPlaceholderSrc(track.src)) {
      surface.innerHTML = `<iframe src="${esc(soundcloudEmbedSrc(track.src, true))}" loading="lazy" allow="autoplay" title="${esc(track.title)}"></iframe>`;
    } else if (track.source === 'audiomack' && !isPlaceholderSrc(track.src)) {
      surface.innerHTML = `<iframe src="${esc(audiomackEmbedSrc(track.src, true))}" loading="lazy" allow="autoplay" title="${esc(track.title)}"></iframe>`;
    } else {
      surface.innerHTML = `<div class="player-surface-note">No embed link set for "${esc(track.title)}" yet — see README → Music tab.</div>`;
    }
  }
  function updatePlayerProgress() {
    if (!Player.audio || !Player.dockEl || !Player.audio.duration) return;
    const fill = Player.dockEl.querySelector('#player-progress-fill');
    if (fill) fill.style.width = `${(Player.audio.currentTime / Player.audio.duration) * 100}%`;
  }
  function renderPlayerDock() {
    if (!Player.mounted) return;
    const dock = Player.dockEl;
    const track = currentTrack();
    const total = Player.ids.length;

    if (!track) {
      dock.querySelector('#player-mini-title').textContent = 'Nothing queued';
      dock.querySelector('#player-mini-sub').textContent = 'Tap a song to start';
      dock.querySelector('#player-mini-art').style.backgroundImage = '';
      dock.querySelector('#player-queue-list').innerHTML = emptyState('Your queue is empty — add a few songs from the Music tab.');
      updateToggleIcons(false);
      return;
    }

    const art = trackImageFor(track);
    dock.querySelector('#player-mini-title').textContent = track.title;
    dock.querySelector('#player-mini-sub').textContent = `${track.type || 'Track'} · ${Player.index + 1} of ${total}`;
    dock.querySelector('#player-mini-art').style.backgroundImage = `url('${art}')`;
    dock.querySelector('#player-now-art').style.backgroundImage = `url('${art}')`;
    dock.querySelector('#player-now-type').textContent = track.type || '';
    dock.querySelector('#player-now-title').textContent = track.title;
    dock.querySelector('#player-now-desc').textContent = track.description || '';
    const favBtn = dock.querySelector('#player-now-fav');
    if (favBtn) {
      const isFav = isFavorite('track', track.id);
      favBtn.textContent = isFav ? '❤' : '♡';
      favBtn.classList.toggle('active', isFav);
      favBtn.setAttribute('aria-pressed', String(isFav));
      favBtn.setAttribute('aria-label', isFav ? 'Remove from Favorites' : 'Add to Favorites');
    }

    if (dock.dataset.currentTrackId !== track.id) {
      dock.dataset.currentTrackId = track.id;
      mountPlayerSurface(track);
    }

    const list = dock.querySelector('#player-queue-list');
    list.innerHTML = queueTracks().map((t, i) => `
      <div class="player-queue-item ${i === Player.index ? 'active' : ''}">
        <button class="player-queue-play" data-play-id="${esc(t.id)}" aria-label="Play ${esc(t.title)}">${i === Player.index ? '▶' : (i + 1)}</button>
        <span class="player-queue-title">${esc(t.title)}</span>
        <div class="player-queue-actions">
          <button data-move-up="${esc(t.id)}" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button data-move-down="${esc(t.id)}" aria-label="Move down" ${i === total - 1 ? 'disabled' : ''}>↓</button>
          <button data-remove-id="${esc(t.id)}" aria-label="Remove from queue">✕</button>
        </div>
      </div>
    `).join('');
    list.querySelectorAll('[data-play-id]').forEach(b => b.addEventListener('click', () => playAt(Player.ids.indexOf(b.dataset.playId))));
    list.querySelectorAll('[data-move-up]').forEach(b => b.addEventListener('click', () => queueMove(b.dataset.moveUp, 'up')));
    list.querySelectorAll('[data-move-down]').forEach(b => b.addEventListener('click', () => queueMove(b.dataset.moveDown, 'down')));
    list.querySelectorAll('[data-remove-id]').forEach(b => b.addEventListener('click', () => queueRemove(b.dataset.removeId)));

    updateToggleIcons(track.source === 'local' && !!Player.audio && !Player.audio.paused);
    markNowPlayingInView();
  }

  function bookAmbientBtnHTML(book) {
    const track = book.themeTrack ? findTrack(book.themeTrack) : null;
    if (!track || track.source !== 'local' || !track.src) return '';
    return `<button class="ambient-toggle-btn" data-ambient-track="${esc(track.id)}">🎧 Listen while you read</button>`;
  }
  function wireBookAmbient(container) {
    const btn = container.querySelector('[data-ambient-track]');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const track = findTrack(btn.dataset.ambientTrack);
      if (currentTrack() && currentTrack().id === track.id && Player.audio && !Player.audio.paused) togglePlayback();
      else playTrackNow(track.id);
    });
  }

  // ---------------- HOME ----------------
  function renderHome() {
    const totalChapters = DATA.books.reduce((n, b) => n + b.chapters.length, 0);
    const qod = DATA.quotes.length ? DATA.quotes[dayIndex() % DATA.quotes.length] : null;
    const tiles = [
      { tab: 'books', num: '01', title: 'Books', desc: 'Fiction & non-fiction, chapter by chapter — unlock the next chapter as you finish the last.', count: `${DATA.books.length} books · ${totalChapters} chapters` },
      { tab: 'poems', num: '02', title: 'Poems', desc: 'Micro, short, long and spoken word — filter by size or let the app surprise you.', count: `${DATA.poems.length} pieces` },
      { tab: 'quotes', num: '03', title: 'Quotes', desc: 'African proverbs and quotes, tagged by theme. A new one greets you each visit.', count: `${DATA.quotes.length} quotes` },
      { tab: 'music', num: '04', title: 'Music', desc: 'Spoken word albums and tracks, streaming right in the app.', count: `${DATA.music.length} tracks` },
      { tab: 'blog', num: '05', title: 'Blog', desc: 'Announcements, Bible study, and behind-the-scenes notes from the studio.', count: `${DATA.blog.length} posts` }
    ];
    const galleryBooks = DATA.books.slice(0, 4);

    root.innerHTML = `
      <section class="hero wrap">
        <span class="hero-eyebrow hero-cta-eyebrow">Sponsor a Poem, Song, Book or Chapter</span>
        <h1>Faith, story and sound<br><em>in one quiet room.</em></h1>
        <p class="lede">JTKiaz App is home for J.T. KIAS's books, poems, quotes and spoken word — built to be read, heard, returned to, and <strong>sponsored</strong> so more of it gets made.</p>
        <a class="btn accent hero-sponsor-btn" href="${waLink("Hi! I'd like to sponsor a poem, song, book or chapter on JTKiaz App 🙏")}" target="_blank" rel="noopener">💛 Sponsor something today</a>
        <div class="hero-stats">
          <button class="hero-stat" onclick="jtkiazNav('books')" aria-label="See all books"><strong>${DATA.books.length}</strong><span>Books</span></button>
          <button class="hero-stat" onclick="jtkiazNav('books')" aria-label="See all chapters"><strong>${totalChapters}</strong><span>Chapters</span></button>
          <button class="hero-stat" onclick="jtkiazNav('poems')" aria-label="See all poems"><strong>${DATA.poems.length}</strong><span>Poems</span></button>
          <button class="hero-stat" onclick="jtkiazNav('quotes')" aria-label="See all quotes"><strong>${DATA.quotes.length}</strong><span>Quotes</span></button>
          <button class="hero-stat" onclick="jtkiazNav('music')" aria-label="See all tracks"><strong>${DATA.music.length}</strong><span>Tracks</span></button>
        </div>
        ${galleryBooks.length ? `
        <div class="hero-gallery">
          ${galleryBooks.map(b => `
            <figure onclick="jtkiazNav('books/${b.id}')" style="cursor:pointer">
              ${b.cover ? `<img src="${esc(coverSrc(b.cover))}" alt="${esc(b.title)}" loading="lazy" onerror="this.remove()">` : ''}
            </figure>
          `).join('')}
        </div>` : ''}
        <img class="frame-watermark br" src="${esc(coverSrc(LOGO_IMAGE))}" alt="" loading="lazy" onerror="this.remove()">
      </section>
      <div class="seam"></div>
      ${qod ? `
      <div class="wrap">
        <div class="quote-of-day scroll-quote">
          <div class="scroll-rod top"></div>
          <div class="scroll-band"></div>
          <span class="eyebrow">Quote of the day</span>
          <blockquote onclick="jtkiazNav('quotes/${qod.id}')" style="cursor:pointer">"${esc(qod.text)}"</blockquote>
          <cite>— ${esc(qod.origin)}</cite>
          <div class="foot">
            <button class="copy-btn" data-text="${esc(qod.text)} — ${esc(qod.origin)}">Copy</button>
            ${favBtnHTML('quote', qod.id, qod.text, qod.origin)}
            <button class="ghost-btn" onclick="jtkiazNav('quotes')">See all quotes →</button>
          </div>
          <div class="scroll-band"></div>
          <div class="scroll-rod bottom"></div>
        </div>
      </div>
      <div class="seam"></div>` : ''}
      <div class="wrap">
        <div class="tile-grid">
          ${tiles.map(t => `
            <button class="tile" onclick="jtkiazNav('${t.tab}')">
              <span class="tile-num">${t.num}</span>
              <h3>${t.title}</h3>
              <p>${t.desc}</p>
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span class="tile-count">${t.count}</span>
                <span class="tile-arrow">Enter →</span>
              </div>
            </button>
          `).join('')}
        </div>
      </div>
    `;
    root.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.dataset.text;
        if (navigator.clipboard) { navigator.clipboard.writeText(text).then(() => showToast('Quote copied')).catch(() => showToast('Could not copy')); }
      });
    });
    wireFavButtons(root);
  }

  // ---------------- per-tab header CTA (different pitch per tab — README §16.1) ----------------
  const TAB_HEADER_CTA = {
    books: { label: '💛 Sponsor a Book', msg: "Hi! I'd like to sponsor a book on JTKiaz App 🙏" },
    poems: { label: '💛 Sponsor a Poem', msg: "Hi! I'd like to sponsor a poem or spoken word piece on JTKiaz App 🙏" },
    quotes: { label: '💛 Commission a Quote', msg: "Hi! I'd like to commission an original quote/proverb card on JTKiaz App 🙏" },
    music: { label: '💛 Sponsor a Song', msg: "Hi! I'd like to sponsor a song or track on JTKiaz App 🙏" },
    blog: { label: '💛 Sponsor the Studio', msg: "Hi! I'd like to support the studio behind this blog 🙏" }
  };
  function tabCtaBtnHTML(section) {
    const c = TAB_HEADER_CTA[section];
    if (!c) return '';
    return `<a class="btn ghost tab-cta-btn" href="${waLink(c.msg)}" target="_blank" rel="noopener">${c.label}</a>`;
  }

  // ---------------- BOOKS ----------------
  function renderBooks() {
    const mode = getViewModes().books;
    root.innerHTML = `
      <div class="wrap view">
        <div class="view-header">
          <div>
            <h2>Books</h2>
            <p>Fiction and non-fiction, released chapter by chapter. Finish a chapter to unlock the next — sponsor one to help fund the next.</p>
          </div>
          <div style="display:flex;gap:0.6rem;flex-wrap:wrap;align-items:center">
            ${viewToggleHTML('books')}
            ${tabCtaBtnHTML('books')}
          </div>
        </div>
        ${mode === 'list'
          ? `<div class="book-list">${DATA.books.map(bookListRowHTML).join('') || emptyState('No books yet — add rows to the Books tab and re-run the build.')}</div>`
          : `<div class="card-grid">${DATA.books.map(bookCardHTML).join('') || emptyState('No books yet — add rows to the Books tab and re-run the build.')}</div>`}
      </div>
    `;
    wireViewToggle(root, 'books', renderBooks);
    wirePlaylistButtons(root);
    wireFavButtons(root);
  }
  function bookListRowHTML(b) {
    return `
      <div class="book-list-row" onclick="jtkiazNav('books/${b.id}')">
        <div class="book-list-thumb">${b.cover ? `<img src="${esc(coverSrc(b.cover))}" alt="" loading="lazy" onerror="this.remove()">` : ''}</div>
        <div class="book-list-info">
          <h3>${esc(b.title)}</h3>
          <p>${esc(b.type)} · ★ ${b.rating.toFixed(1)} · ${b.chapters.length} ch.</p>
        </div>
        ${favBtnHTML('book', b.id, b.title, b.type)}
      </div>
    `;
  }

  function bookCardHTML(b) {
    const unlocked = unlockedSet(b.id);
    const pct = Math.round((Math.min(unlocked.size, b.chapters.length) / b.chapters.length) * 100);
    return `
      <div class="book-card" style="--book-accent:${esc(b.themeColor || '')}">
        <div class="book-cover" onclick="jtkiazNav('books/${b.id}')" style="cursor:pointer">
          ${b.cover ? `<img src="${esc(coverSrc(b.cover))}" alt="${esc(b.title)}" loading="lazy" onerror="this.remove()">` : ''}
          <span class="type-tag">${esc(b.type)}</span>
          ${favBtnCornerHTML('book', b.id, b.title, b.type)}
        </div>
        <div class="book-body">
          <h3 onclick="jtkiazNav('books/${b.id}')" style="cursor:pointer">${esc(b.title)}</h3>
          <div class="book-meta"><span>★ ${b.rating.toFixed(1)}</span><span>${b.chapters.length} ch.</span></div>
          <p class="summary">${esc(b.summary)}</p>
          <div class="tag-row">${b.tags.slice(0, 3).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
          <div class="progress-bar"><span style="width:${pct}%"></span></div>
          <div class="card-actions">
            <button class="btn ghost" onclick="jtkiazNav('books/${b.id}')">Open</button>
            <button class="quick-share-btn" data-quick-share="book" data-quick-share-id="${esc(b.id)}" data-quick-share-title="${esc(b.title)}" aria-label="Share ${esc(b.title)}">↗ Share</button>
            ${playlistAddBtnHTML('book', b.id, b.title, b.type, b.cover)}
          </div>
        </div>
      </div>
    `;
  }

  function renderBookDetail(bookId, chapterNum) {
    const book = findBook(bookId);
    if (!book) return renderNotFound('books');
    if (chapterNum) return renderChapterReader(book, parseInt(chapterNum, 10));
    updateFooterCta('books', book.title);

    const unlocked = unlockedSet(book.id);
    root.innerHTML = `
      <div class="wrap view" style="--book-accent:${esc(book.themeColor || '')}">
        <span class="back-link" onclick="jtkiazNav('books')">&larr; All books</span>
        <div class="view-header">
          <div>
            <h2>${esc(book.title)}</h2>
            <p>${esc(book.summary)}</p>
          </div>
        </div>
        <div class="tag-row" style="margin-bottom:1.5rem">${book.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        <div class="card-actions" style="margin-bottom:1rem">${playlistAddBtnHTML('book', book.id, book.title, book.type, book.cover)}${favBtnHTML('book', book.id, book.title, book.type)}</div>
        ${engageBarHTML('book', book.id, book.title)}
        <div class="chapter-list">
          ${book.chapters.map(c => {
            const isUnlocked = unlocked.has(c.number);
            return `
              <div class="chapter-row ${isUnlocked ? 'unlocked' : 'locked'}" ${isUnlocked ? `onclick="jtkiazNav('books/${book.id}/${c.number}')"` : ''}>
                <div class="chapter-left">
                  <span class="chapter-index">${String(c.number).padStart(2, '0')}</span>
                  <span class="chapter-title">${esc(c.title)}</span>
                </div>
                <span class="chapter-status">${isUnlocked ? (unlocked.has(c.number) && (getProgress()[book.id] || {}).lastRead >= c.number ? 'Read' : 'Unlocked') : '🔒 Locked'}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    wireEngageBar(root);
    wirePlaylistButtons(root);
    wireFavButtons(root);
  }

  function renderChapterReader(book, num) {
    const chapter = book.chapters.find(c => c.number === num);
    const unlocked = unlockedSet(book.id);
    if (!chapter || !unlocked.has(num)) return renderBookDetail(book.id);

    markChapterRead(book.id, num, book.chapters.length);
    const next = book.chapters.find(c => c.number === num + 1);
    if (book.themeFont) ensureFont(book.themeFont);
    updateFooterCta('books', `${book.title} — Ch. ${chapter.number}`);

    const heroImg = chapter.image || book.cover;
    const key = `book:${book.id}:${chapter.number}`;
    const favChapterId = `${book.id}:${chapter.number}`;
    const bodyHTML = renderTextWithPopups(formatBodyText(chapter.content), chapter.popups, key);

    const fontDecl = book.themeFont ? `--font-reader:'${esc(book.themeFont)}', var(--font-display);` : '';
    root.innerHTML = `
      <div class="wrap view" style="--book-accent:${esc(book.themeColor || '')}; ${fontDecl}">
        <span class="back-link" onclick="jtkiazNav('books/${book.id}')">&larr; ${esc(book.title)}</span>
        ${readerToolbarHTML()}
        ${bookAmbientBtnHTML(book)}
        <div class="reader framed">
          <img class="frame-watermark br" src="${esc(coverSrc(LOGO_IMAGE))}" alt="" loading="lazy" onerror="this.remove()">
          <figure class="chapter-hero">
            ${heroImg ? `<img src="${esc(coverSrc(heroImg))}" alt="${esc(chapter.imageCaption || chapter.title)}" loading="lazy" onerror="this.remove()">` : ''}
            ${chapter.imageCaption ? `<figcaption>${esc(chapter.imageCaption)}</figcaption>` : ''}
          </figure>
          <h2>${esc(chapter.title)}</h2>
          <div class="reader-meta">${esc(book.title)} · Chapter ${chapter.number} of ${book.chapters.length} · ${chapter.wordCount || '—'} words · ~${estReadMinutes(chapter.wordCount)} min read</div>
          <div class="body-text">${bodyHTML}</div>
          <div class="card-actions">
            ${playlistAddBtnHTML('book-chapter', key, `${book.title} — Ch. ${chapter.number}: ${chapter.title}`, book.title, book.cover)}
            ${favBtnHTML('chapter', favChapterId, `${book.title} — Ch. ${chapter.number}: ${chapter.title}`, book.title)}
          </div>
          ${engageBarHTML('book-chapter', key, `${book.title} — Ch. ${chapter.number}: ${chapter.title}`)}
          <div class="reader-actions">
            <button class="btn ghost" onclick="jtkiazNav('books/${book.id}')">All chapters</button>
            ${next
              ? `<button class="btn accent" onclick="jtkiazNav('books/${book.id}/${next.number}')">Next chapter → (unlocked)</button>`
              : `<span class="chapter-status">You've reached the last chapter.</span>`}
          </div>
        </div>
      </div>
    `;
    wireReaderToolbar(root);
    wireEngageBar(root);
    wirePlaylistButtons(root);
    wireFavButtons(root);
    wireBookAmbient(root);
    updateScrollProgress();
  }

  // ---------------- POEMS ----------------
  let poemFilter = 'All';
  // The order a reader is currently browsing poems in — set whenever the
  // Poems tab (or a filtered chip, or a collection jump) is rendered, so
  // ←/→ on a poem's page steps through the same set, wrapping around at
  // the ends (README §5.1). The grid itself reshuffles this on every visit
  // so a library of 300+ poems doesn't always show the same few first.
  let poemNavOrder = DATA.poems;
  function poemCollections() {
    return Array.from(new Set(DATA.poems.map(p => p.collection))).filter(Boolean);
  }
  function poemNavNeighbors(currentId) {
    const order = poemNavOrder && poemNavOrder.length ? poemNavOrder : DATA.poems;
    const idx = order.findIndex(p => p.id === currentId);
    if (idx === -1 || order.length < 2) return null;
    const prev = order[(idx - 1 + order.length) % order.length];
    const next = order[(idx + 1) % order.length];
    return { prevId: prev.id, prevTitle: prev.title, nextId: next.id, nextTitle: next.title };
  }
  function poemPositionInfo(poem) {
    const order = poemNavOrder && poemNavOrder.length ? poemNavOrder : DATA.poems;
    const idx = order.findIndex(p => p.id === poem.id);
    return { idx: idx === -1 ? 0 : idx, total: order.length || DATA.poems.length };
  }
  // ↑/↓ jump to a (random) poem in the previous/next collection — "change
  // poem type" — while ←/→ (poemNavNeighbors above) move within the type.
  function poemTypeNeighbor(poem, direction) {
    const collections = poemCollections();
    if (collections.length < 2) return null;
    let idx = collections.indexOf(poem.collection);
    if (idx === -1) idx = 0;
    const nextIdx = (idx + (direction === 'next' ? 1 : -1) + collections.length) % collections.length;
    const nextCollection = collections[nextIdx];
    const pool = DATA.poems.filter(p => p.collection === nextCollection);
    if (!pool.length) return null;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return { collection: nextCollection, id: pick.id, pool };
  }
  function jumpPoemType(poem, direction) {
    const n = poemTypeNeighbor(poem, direction);
    if (!n) return;
    poemNavOrder = n.pool;
    navigate(`poems/${n.id}`);
  }

  // The nav block shown under every open poem: where you are ("bearing"),
  // quick chips to jump straight to another type, and the ↑↓/←→ controls
  // (also usable with actual arrow keys — see the keydown handler below).
  // The tab bar up top and the "Surprise me" option both stay reachable
  // the whole time, so a reader never has to back out to the grid (§5.1).
  function poemNavBlockHTML(poem) {
    const pos = poemPositionInfo(poem);
    const n = poemNavNeighbors(poem.id);
    const collections = poemCollections();
    return `
      <div class="poem-nav-block" aria-label="Browse poems">
        <div class="poem-position">${esc(poem.collection)} · piece ${pos.idx + 1} of ${pos.total}${collections.length > 1 ? ' · ←→ to browse' : ''}</div>
        ${collections.length > 1 ? `
        <div class="filter-bar poem-detail-chips">
          ${collections.map(c => `<button class="chip ${c === poem.collection ? 'active' : ''}" data-jump-collection="${esc(c)}">${esc(c)}</button>`).join('')}
        </div>` : ''}
        ${n ? `
        <div class="poem-nav-row poem-nav-piece">
          <button data-poem-adj="prev" title="${esc(n.prevTitle)}">← Previous poem</button>
          <button data-poem-adj="next" title="${esc(n.nextTitle)}">Next poem →</button>
        </div>` : ''}
        ${collections.length > 1 ? `
        <div class="poem-nav-row poem-nav-type">
          <button data-poem-type="prev">▲ Previous type</button>
          <button data-poem-type="next">▼ Next type</button>
        </div>` : ''}
      </div>
    `;
  }
  function wirePoemNav(container, poem) {
    const block = container.querySelector('.poem-nav-block');
    if (!block) return;
    const n = poemNavNeighbors(poem.id);
    if (n) {
      var _prevBtn = block.querySelector('[data-poem-adj="prev"]'); if (_prevBtn) _prevBtn.addEventListener('click', () => navigate(`poems/${n.prevId}`));
      var _nextBtn = block.querySelector('[data-poem-adj="next"]'); if (_nextBtn) _nextBtn.addEventListener('click', () => navigate(`poems/${n.nextId}`));
    }
    block.querySelectorAll('[data-jump-collection]').forEach(btn => {
      btn.addEventListener('click', () => {
        const coll = btn.dataset.jumpCollection;
        const pool = DATA.poems.filter(p => p.collection === coll);
        if (!pool.length) return;
        poemNavOrder = pool;
        navigate(`poems/${pool[Math.floor(Math.random() * pool.length)].id}`);
      });
    });
    const prevType = block.querySelector('[data-poem-type="prev"]');
    const nextType = block.querySelector('[data-poem-type="next"]');
    if (prevType) prevType.addEventListener('click', () => jumpPoemType(poem, 'prev'));
    if (nextType) nextType.addEventListener('click', () => jumpPoemType(poem, 'next'));
  }
  // arrow-key browsing — active whenever a single poem is open. Only
  // ←/→ move between poems (the standard "next/prev" convention); ↑/↓ are
  // left alone so the page scrolls normally like anywhere else. Switching
  // type is still available any time via the ▲/▼ buttons in the nav block.
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const parts = parseHash();
    if (parts[0] !== 'poems' || !parts[1]) return;
    const poem = findPoem(parts[1]);
    if (!poem) return;
    if (e.key === 'ArrowRight') {
      const n = poemNavNeighbors(poem.id);
      if (n) { e.preventDefault(); navigate(`poems/${n.nextId}`); }
    } else if (e.key === 'ArrowLeft') {
      const n = poemNavNeighbors(poem.id);
      if (n) { e.preventDefault(); navigate(`poems/${n.prevId}`); }
    }
  });

  function renderPoems() {
    const collections = ['All', ...poemCollections()];
    let list = poemFilter === 'All' ? DATA.poems : DATA.poems.filter(p => p.collection === poemFilter);
    list = shuffle(list); // fresh order every visit — README §5.1
    poemNavOrder = list;
    const mode = getViewModes().poems;

    root.innerHTML = `
      <div class="wrap view">
        <div class="view-header">
          <div>
            <h2>Poems</h2>
            <p>Micro, short, long and spoken word pieces. Filter by size, hit surprise me, or sponsor one that moves you. The order shuffles every visit so nothing gets buried.</p>
          </div>
          <div style="display:flex;gap:0.6rem;flex-wrap:wrap;align-items:center">
            ${viewToggleHTML('poems')}
            <button class="btn" id="surprise-btn">🎲 Surprise me</button>
            ${tabCtaBtnHTML('poems')}
          </div>
        </div>
        <div class="filter-bar">
          ${collections.map(c => `<button class="chip ${c === poemFilter ? 'active' : ''}" data-collection="${esc(c)}">${esc(c)}</button>`).join('')}
        </div>
        <div class="poem-position">${list.length} piece${list.length === 1 ? '' : 's'}${poemFilter !== 'All' ? ` in ${esc(poemFilter)}` : ''}</div>
        ${mode === 'list'
          ? `<div class="poem-list">${list.map(poemListRowHTML).join('') || emptyState('No poems in this collection yet — add rows to data-source/poems.csv.')}</div>`
          : `<div class="poem-grid">${list.map(poemCardHTML).join('') || emptyState('No poems in this collection yet — add rows to data-source/poems.csv.')}</div>`}
      </div>
    `;

    root.querySelectorAll('[data-collection]').forEach(btn => {
      btn.addEventListener('click', () => { poemFilter = btn.dataset.collection; renderPoems(); });
    });
    root.querySelector('#surprise-btn').addEventListener('click', () => {
      if (!DATA.poems.length) return;
      const random = DATA.poems[Math.floor(Math.random() * DATA.poems.length)];
      navigate(`poems/${random.id}`);
    });
    wireViewToggle(root, 'poems', renderPoems);
    wirePlaylistButtons(root);
    wireFavButtons(root);
  }

  function poemCardHTML(p) {
    const snippet = p.isMultiPart ? p.parts[0].body : p.body;
    const img = poemImageFor(p);
    return `
      <div class="poem-card" style="--poem-accent:${esc(p.color || '')}">
        <div class="poem-thumb" onclick="jtkiazNav('poems/${p.id}')" style="cursor:pointer">
          <img src="${esc(img)}" alt="${esc(p.title)}" loading="lazy" onerror="this.remove()">
          <span class="collection-tag">${esc(p.collection)}${p.isMultiPart ? ` · ${p.parts.length} parts` : ''}</span>
          ${favBtnCornerHTML('poem', p.id, p.title, p.collection)}
        </div>
        <div class="poem-body">
          <div onclick="jtkiazNav('poems/${p.id}')" style="cursor:pointer">
            <h3>${esc(p.title)}</h3>
            <p class="snippet">${esc(snippet.slice(0, 90))}${snippet.length > 90 ? '…' : ''}</p>
          </div>
          <div class="card-actions">${playlistAddBtnHTML('poem', p.id, p.title, p.collection, '')}</div>
        </div>
      </div>
    `;
  }
  function poemListRowHTML(p) {
    const snippet = p.isMultiPart ? p.parts[0].body : p.body;
    const img = poemImageFor(p);
    return `
      <div class="poem-list-row" onclick="jtkiazNav('poems/${p.id}')">
        <div class="poem-list-thumb"><img src="${esc(img)}" alt="" loading="lazy" onerror="this.remove()"></div>
        <div class="poem-list-info">
          <h3>${esc(p.title)}</h3>
          <span class="snippet">${esc(p.collection)} · ${esc(snippet.slice(0, 70))}${snippet.length > 70 ? '…' : ''}</span>
        </div>
        ${favBtnHTML('poem', p.id, p.title, p.collection)}
      </div>
    `;
  }

  function renderPoemDetail(poemId) {
    const poem = findPoem(poemId);
    if (!poem) return renderNotFound('poems');
    if (poem.font) ensureFont(poem.font);
    updateFooterCta('poems', poem.title);

    if (poem.isMultiPart) {
      renderPoemMultiPart(poem, 0);
      return;
    }

    const poemFontDecl = poem.font ? `--poem-font:'${esc(poem.font)}', var(--font-display);` : '';
    const heroImg = poemImageFor(poem);
    root.innerHTML = `
      <div class="wrap view" style="--poem-accent:${esc(poem.color || '')}; ${poemFontDecl}">
        <span class="back-link" onclick="jtkiazNav('poems')">&larr; All poems</span>
        <figure class="poem-hero"><img src="${esc(heroImg)}" alt="${esc(poem.title)}" loading="lazy" onerror="this.parentElement.remove()"></figure>
        <div class="reader framed accent">
          <img class="frame-watermark br" src="${esc(coverSrc(LOGO_IMAGE))}" alt="" loading="lazy" onerror="this.remove()">
          <span class="collection-tag">${esc(poem.collection)}</span>
          <h2>${esc(poem.title)}</h2>
          <div class="poem-modal-body">${formatPoemText(poem.body)}</div>
          ${poem.sound ? `<button class="poem-sound-btn" id="poem-sound-btn">▶ Play ambient sound</button>` : ''}
          <div class="tag-row" style="margin-top:1.5rem">${poem.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
          <div class="card-actions" style="margin-top:1rem">${playlistAddBtnHTML('poem', poem.id, poem.title, poem.collection, '')}${favBtnHTML('poem', poem.id, poem.title, poem.collection)}</div>
          ${engageBarHTML('poem', poem.id, poem.title)}
          ${poemNavBlockHTML(poem)}
        </div>
      </div>
    `;
    wirePoemSound(poem);
    wireEngageBar(root);
    wirePlaylistButtons(root);
    wireFavButtons(root);
    wirePoemNav(root, poem);
    updateScrollProgress();
  }

  function renderPoemMultiPart(poem, activeIdx) {
    const part = poem.parts[activeIdx];
    const poemFontDecl2 = poem.font ? `--poem-font:'${esc(poem.font)}', var(--font-display);` : '';
    const heroImg2 = poemImageFor(poem);
    root.innerHTML = `
      <div class="wrap view" style="--poem-accent:${esc(poem.color || '')}; ${poemFontDecl2}">
        <span class="back-link" onclick="jtkiazNav('poems')">&larr; All poems</span>
        <figure class="poem-hero"><img src="${esc(heroImg2)}" alt="${esc(poem.title)}" loading="lazy" onerror="this.parentElement.remove()"></figure>
        <div class="reader framed accent">
          <img class="frame-watermark br" src="${esc(coverSrc(LOGO_IMAGE))}" alt="" loading="lazy" onerror="this.remove()">
          <span class="collection-tag">${esc(poem.collection)}</span>
          <h2>${esc(poem.title)}</h2>
          <div class="part-tabs">
            ${poem.parts.map((pt, i) => `<button data-idx="${i}" class="${i === activeIdx ? 'active' : ''}">Part ${pt.partNumber}</button>`).join('')}
          </div>
          <div class="poem-modal-body">${formatPoemText(part.body)}</div>
          ${poem.sound ? `<button class="poem-sound-btn" id="poem-sound-btn">▶ Play ambient sound</button>` : ''}
          <div class="card-actions" style="margin-top:1rem">${playlistAddBtnHTML('poem', poem.id, poem.title, poem.collection, '')}${favBtnHTML('poem', poem.id, poem.title, poem.collection)}</div>
          ${engageBarHTML('poem', `${poem.id}-part${part.partNumber}`, `${poem.title} — Part ${part.partNumber}`)}
          ${poemNavBlockHTML(poem)}
        </div>
      </div>
    `;
    root.querySelectorAll('.part-tabs button').forEach(btn => {
      btn.addEventListener('click', () => renderPoemMultiPart(poem, parseInt(btn.dataset.idx, 10)));
    });
    wirePoemSound(poem);
    wireEngageBar(root);
    wirePlaylistButtons(root);
    wireFavButtons(root);
    wirePoemNav(root, poem);
    updateScrollProgress();
  }

  let ambientAudio = null;
  function wirePoemSound(poem) {
    const btn = root.querySelector('#poem-sound-btn');
    if (!btn || !poem.sound) return;
    btn.addEventListener('click', () => {
      if (ambientAudio && !ambientAudio.paused) { ambientAudio.pause(); btn.textContent = '▶ Play ambient sound'; return; }
      if (!ambientAudio) ambientAudio = new Audio(coverSrc(poem.sound));
      ambientAudio.loop = true;
      ambientAudio.play().catch(() => showToast('Could not play sound'));
      btn.textContent = '⏸ Pause ambient sound';
    });
  }

  // ---------------- QUOTES ----------------
  // ---------------- QUOTES ----------------
  let quoteFilter = 'All';
  // Tags start collapsed — with 100+ tags in play, showing them all by
  // default buries the quotes themselves. Shows a handful plus a
  // "show all" toggle; the active filter is always kept visible even
  // when collapsed.
  let quoteTagsExpanded = false;
  const QUOTE_TAG_COLLAPSE_COUNT = 10;
  function quoteTagChipsHTML(activeTag, dataAttr) {
    const all = ['All', ...quoteTags()];
    let visible = all;
    if (!quoteTagsExpanded && all.length > QUOTE_TAG_COLLAPSE_COUNT + 1) {
      visible = all.slice(0, QUOTE_TAG_COLLAPSE_COUNT);
      if (!visible.includes(activeTag)) visible = visible.concat(activeTag);
    }
    const chips = visible.map(t => `<button class="chip ${t === activeTag ? 'active' : ''}" data-${dataAttr}="${esc(t)}">${esc(t)}</button>`).join('');
    const toggle = all.length > QUOTE_TAG_COLLAPSE_COUNT + 1
      ? `<button class="chip chip-toggle" data-tags-toggle="1">${quoteTagsExpanded ? '▴ Show fewer tags' : `▾ Show all ${all.length - 1} tags`}</button>`
      : '';
    return `<div class="filter-bar">${chips}${toggle}</div>`;
  }
  function wireQuoteTagToggle(container, rerenderFn) {
    const btn = container.querySelector('[data-tags-toggle]');
    if (btn) btn.addEventListener('click', () => { quoteTagsExpanded = !quoteTagsExpanded; rerenderFn(); });
  }
  // browsing order for ←/→ once a quote is open — set whenever the grid,
  // list, or a tag chip is rendered, same pattern as Poems (§5.1)
  let quoteNavOrder = DATA.quotes;
  function quoteTags() {
    const set = new Set();
    DATA.quotes.forEach(q => (q.tags || []).forEach(t => set.add(t)));
    // surface the three common ones first if present, then the rest A-Z
    const priority = ['Old Testament', 'New Testament', 'African'];
    const rest = Array.from(set).filter(t => !priority.includes(t)).sort();
    return priority.filter(t => set.has(t)).concat(rest);
  }
  function quoteNavNeighbors(currentId) {
    const order = quoteNavOrder && quoteNavOrder.length ? quoteNavOrder : DATA.quotes;
    const idx = order.findIndex(q => q.id === currentId);
    if (idx === -1 || order.length < 2) return null;
    const prev = order[(idx - 1 + order.length) % order.length];
    const next = order[(idx + 1) % order.length];
    return { prevId: prev.id, nextId: next.id };
  }
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const parts = parseHash();
    if (parts[0] !== 'quotes' || !parts[1]) return;
    const q = DATA.quotes.find(x => x.id === parts[1]);
    if (!q) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      const n = quoteNavNeighbors(q.id);
      if (n) { e.preventDefault(); navigate(`quotes/${n.nextId}`); }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      const n = quoteNavNeighbors(q.id);
      if (n) { e.preventDefault(); navigate(`quotes/${n.prevId}`); }
    }
  });

  function renderQuotes() {
    const qod = DATA.quotes.length ? DATA.quotes[dayIndex() % DATA.quotes.length] : null;
    const mode = getViewModes().quotes;
    let list = quoteFilter === 'All' ? DATA.quotes : DATA.quotes.filter(q => (q.tags || []).includes(quoteFilter));
    // with 1000+ quotes possible, recycle/rotate the order every visit —
    // same trick as Poems (§5.1) and Music (§7.1) so nothing gets buried
    list = shuffle(list);
    quoteNavOrder = list;
    root.innerHTML = `
      <div class="wrap view">
        <div class="view-header">
          <div>
            <h2>Quotes</h2>
            <p>Old Testament, New Testament and African proverbs, tagged by theme. Order rotates every visit so nothing gets buried — commission an original one of your own.</p>
          </div>
          <div style="display:flex;gap:0.6rem;flex-wrap:wrap;align-items:center">
            ${viewToggleHTML('quotes')}
            ${tabCtaBtnHTML('quotes')}
          </div>
        </div>
        ${qod ? `
        <div class="quote-of-day scroll-quote">
          <div class="scroll-rod top"></div>
          <div class="scroll-band"></div>
          <span class="eyebrow">Quote of the day</span>
          <blockquote onclick="jtkiazNav('quotes/${qod.id}')" style="cursor:pointer">"${esc(qod.text)}"</blockquote>
          <cite>— ${esc(qod.origin)}</cite>
          <div class="foot">
            <button class="copy-btn" data-text="${esc(qod.text)} — ${esc(qod.origin)}">Copy</button>
            ${favBtnHTML('quote', qod.id, qod.text, qod.origin)}
            <button class="ghost-btn" onclick="jtkiazNav('quotes/${qod.id}')">Open →</button>
          </div>
          <div class="scroll-band"></div>
          <div class="scroll-rod bottom"></div>
        </div>` : ''}
        ${quoteTagChipsHTML(quoteFilter, 'tag')}
        <div class="poem-position">${list.length} quote${list.length === 1 ? '' : 's'}${quoteFilter !== 'All' ? ` tagged ${esc(quoteFilter)}` : ''}</div>
        ${mode === 'list'
          ? `<div class="quote-rows">${list.map(quoteRowHTML).join('') || emptyState('No quotes tagged this way yet.')}</div>`
          : `<div class="quote-list">${list.map(quoteCardHTML).join('') || emptyState('No quotes tagged this way yet.')}</div>`}
      </div>
    `;
    root.querySelectorAll('[data-tag]').forEach(btn => {
      btn.addEventListener('click', () => { quoteFilter = btn.dataset.tag; renderQuotes(); });
    });
    wireQuoteTagToggle(root, renderQuotes);
    root.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.dataset.text;
        if (navigator.clipboard) { navigator.clipboard.writeText(text).then(() => showToast('Quote copied')).catch(() => showToast('Could not copy')); }
      });
    });
    wireViewToggle(root, 'quotes', renderQuotes);
    wireFavButtons(root);
  }
  function dayIndex() {
    const d = new Date();
    return d.getFullYear() * 1000 + Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  }
  function quoteCardHTML(q) {
    return `
      <div class="quote-card" onclick="jtkiazNav('quotes/${q.id}')" style="cursor:pointer">
        <p class="text">"${esc(q.text)}"</p>
        <div class="foot">
          <cite>— ${esc(q.origin)}</cite>
          <div style="display:flex;align-items:center;gap:0.3rem">
            ${favBtnHTML('quote', q.id, q.text, q.origin)}
            <button class="copy-btn" data-text="${esc(q.text)} — ${esc(q.origin)}">Copy</button>
          </div>
        </div>
        <div class="tag-row" style="margin-top:0.6rem">${q.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
      </div>
    `;
  }
  function quoteRowHTML(q) {
    return `
      <div class="quote-row" onclick="jtkiazNav('quotes/${q.id}')" style="cursor:pointer">
        <p class="text">"${esc(q.text)}" <cite>— ${esc(q.origin)}</cite></p>
        <div style="display:flex;align-items:center;gap:0.3rem">
          ${favBtnHTML('quote', q.id, q.text, q.origin)}
          <button class="copy-btn" data-text="${esc(q.text)} — ${esc(q.origin)}">Copy</button>
        </div>
      </div>
    `;
  }
  // Single-quote page — the "essene scroll" treatment: a rolled parchment
  // card with a decorative band, the quote large and centered, and the
  // same ←/→ (and on-screen prev/next) browsing Poems uses, so a reader
  // never has to back out to the grid between quotes. Tag chips stay
  // visible too, for jumping straight to another theme (README §6).
  function renderQuoteDetail(id) {
    const q = DATA.quotes.find(x => x.id === id);
    if (!q) return renderNotFound('quotes');
    updateFooterCta('quotes', q.text.slice(0, 60));
    const n = quoteNavNeighbors(q.id);
    const order = quoteNavOrder && quoteNavOrder.length ? quoteNavOrder : DATA.quotes;
    const pos = order.findIndex(x => x.id === q.id);
    root.innerHTML = `
      <div class="wrap view">
        <span class="back-link" onclick="jtkiazNav('quotes')">&larr; All quotes</span>
        <div class="scroll-quote scroll-quote-detail">
          <div class="scroll-rod top"></div>
          <div class="scroll-band"></div>
          <blockquote>"${esc(q.text)}"</blockquote>
          <cite>— ${esc(q.origin)}</cite>
          <div class="tag-row" style="justify-content:center;margin-top:1rem">${q.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
          <div class="foot" style="justify-content:center;gap:0.8rem">
            <button class="copy-btn" data-text="${esc(q.text)} — ${esc(q.origin)}">Copy</button>
            ${favBtnHTML('quote', q.id, q.text, q.origin)}
          </div>
          <div class="scroll-band"></div>
          <div class="scroll-rod bottom"></div>
        </div>
        ${engageBarHTML('quote', q.id, q.text.slice(0, 60))}
        <div class="poem-nav-block">
          <div class="poem-position">${pos > -1 ? `Quote ${pos + 1} of ${order.length}` : ''}${quoteFilter !== 'All' ? ` · ${esc(quoteFilter)}` : ''} · ←→ to browse</div>
          ${quoteTagChipsHTML(quoteFilter, 'jump-tag')}
          ${n ? `
          <div class="poem-nav-row poem-nav-piece">
            <button data-quote-adj="prev">← Previous quote</button>
            <button data-quote-adj="next">Next quote →</button>
          </div>` : ''}
        </div>
      </div>
    `;
    root.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (navigator.clipboard) { navigator.clipboard.writeText(btn.dataset.text).then(() => showToast('Quote copied')).catch(() => showToast('Could not copy')); }
      });
    });
    if (n) {
      root.querySelector('[data-quote-adj="prev"]').addEventListener('click', () => navigate(`quotes/${n.prevId}`));
      root.querySelector('[data-quote-adj="next"]').addEventListener('click', () => navigate(`quotes/${n.nextId}`));
    }
    wireQuoteTagToggle(root, () => renderQuoteDetail(id));
    root.querySelectorAll('[data-jump-tag]').forEach(btn => {
      btn.addEventListener('click', () => {
        quoteFilter = btn.dataset.jumpTag;
        const pool = quoteFilter === 'All' ? DATA.quotes : DATA.quotes.filter(x => (x.tags || []).includes(quoteFilter));
        if (!pool.length) return;
        quoteNavOrder = pool;
        navigate(`quotes/${pool[Math.floor(Math.random() * pool.length)].id}`);
      });
    });
    wireEngageBar(root);
    wireFavButtons(root);
    updateScrollProgress();
  }

  // ---------------- MUSIC ----------------
  function renderMusic() {
    // fresh order every visit, same trick as the Poems tab — with 30+
    // tracks, always leading with the same few buries the rest (README §7)
    const list = shuffle(DATA.music);
    root.innerHTML = `
      <div class="wrap view">
        <figure class="music-hero">
          <img src="${esc(coverSrc(MUSIC_HERO_IMAGE))}" alt="${esc(MUSIC_HERO_TITLE)}" loading="lazy" onerror="this.remove()">
          <div class="music-hero-overlay">
            <div>
              <h3>${esc(MUSIC_HERO_TITLE)}</h3>
              <p>${esc(MUSIC_HERO_SUBTITLE)}</p>
            </div>
          </div>
        </figure>
        <div class="view-header">
          <div>
            <h2>Music</h2>
            <p>${list.length} track${list.length === 1 ? '' : 's'} — every player below is live, so press play right where you see it. Scroll for more; each one's a different vibe. Studio time isn't free — sponsor the next one.</p>
          </div>
          <div style="display:flex;gap:0.6rem;flex-wrap:wrap;align-items:center">
            ${tabCtaBtnHTML('music')}
          </div>
        </div>
        <div class="track-list">${list.map(trackRowHTML).join('') || emptyState('No tracks yet — add rows to the Music tab of the workbook.')}</div>
      </div>
    `;
    root.querySelectorAll('.track-row').forEach(wireEngageBar);
    wirePlaylistButtons(root);
    wireTrackButtons(root);
    wireFavButtons(root);
    scheduleWhatsNewOverlay();
  }
  function wireTrackButtons(container) {
    // Only self-hosted ("local") tracks carry data-play-track now — the
    // real, single shared <audio> player also used for book/poem ambient
    // sound. SoundCloud/Audiomack tracks are static embeds with no JS
    // hook, so this is a no-op for them (nothing to wire up, by design).
    container.querySelectorAll('[data-play-track]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); playTrackNow(btn.dataset.playTrack); });
    });
  }
  // List is the ONLY view for Music — every track's real player is shown
  // right here, all the time, no click/tab/queue system involved. Grid
  // view and the queue/"now playing" machinery used to route SoundCloud
  // and Audiomack tracks through the same play/pause system as
  // self-hosted files — that's what kept breaking. Third-party embeds
  // don't give us a way to detect or control their play state from the
  // outside, so from here on they just... play, right where they sit.
  function trackEmbedIframeHTML(t) {
    const src = t.source === 'soundcloud' ? soundcloudEmbedSrc(t.src, false) : audiomackEmbedSrc(t.src, false);
    return `<div class="track-embed"><iframe src="${esc(src)}" loading="lazy" allow="autoplay" scrolling="no" frameborder="no" title="${esc(t.title)}"></iframe></div>`;
  }
  // Full detail per track: description, the real embedded player (or a
  // plain "not set up yet" note if the link's missing), the engagement
  // bar (view/like counts — same keys admin-stats.html reads), and —
  // for self-hosted files only — a Play button through the same
  // shared player used for book/poem ambient sound (that one's a real
  // <audio> element under our control, so Play/Pause genuinely works).
  function trackRowHTML(t) {
    const img = trackImageFor(t);
    const isEmbeddable = t.source === 'soundcloud' || t.source === 'audiomack';
    const playerBlock = isEmbeddable
      ? (isPlaceholderSrc(t.src) ? trackMissingEmbedNoteHTML(t) : trackEmbedIframeHTML(t))
      : (t.source === 'local' && !isPlaceholderSrc(t.src)
          ? `<div class="card-actions"><button class="btn" data-play-track="${esc(t.id)}">▶ Play</button></div>`
          : trackMissingEmbedNoteHTML(t));
    return `
      <div class="track-row">
        <div class="track-row-top">
          <div class="track-row-thumb"><img src="${esc(img)}" alt="" loading="lazy" onerror="this.remove()"></div>
          <div class="track-head">
            <h3>${esc(t.title)}</h3>
            <span class="track-type">${esc(t.type)}</span>
          </div>
        </div>
        <p class="track-desc">${esc(t.description)}</p>
        ${playerBlock}
        <div class="card-actions">
          ${playlistAddBtnHTML('track', t.id, t.title, t.type, '')}
          ${favBtnHTML('track', t.id, t.title, t.type)}
        </div>
        ${engageBarHTML('track', t.id, t.title)}
      </div>
    `;
  }

  // ---------------- BLOG ----------------
  // The Facebook Page now renders via Facebook's own JS SDK (not a fixed-size
  // iframe), so it can actually adapt its width to the container — on a
  // phone, a tablet, or a wide desktop screen — the same way the real
  // facebook.com page does. See README §8.11.
  let fbSdkState = 'idle'; // idle | loading | ready
  let pendingFbCallbacks = [];
  function ensureFacebookSDK(cb) {
    if (fbSdkState === 'ready' && window.FB) { cb(); return; }
    if (!document.getElementById('fb-root')) {
      const rootDiv = document.createElement('div');
      rootDiv.id = 'fb-root';
      document.body.appendChild(rootDiv);
    }
    if (fbSdkState === 'loading') { pendingFbCallbacks.push(cb); return; }
    fbSdkState = 'loading';
    pendingFbCallbacks = [cb];
    window.fbAsyncInit = function () {
      window.FB.init({ xfbml: true, version: 'v19.0' });
      fbSdkState = 'ready';
      pendingFbCallbacks.forEach(fn => fn());
      pendingFbCallbacks = [];
    };
    const script = document.createElement('script');
    script.async = true; script.defer = true; script.crossOrigin = 'anonymous';
    script.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v19.0';
    document.body.appendChild(script);
  }
  function facebookFeedHTML() {
    if (!FACEBOOK_PAGE_URL) return '';
    return `
      <div class="fb-feed-block">
        <div class="fb-feed-head">
          <span class="eyebrow">Live from Facebook</span>
          <p>The JT KIAS Facebook Page, right inside the app — posts, photos and updates appear here the moment you post them, nothing to copy over.</p>
        </div>
        <div class="fb-embed-wrap framed">
          <div class="fb-embed-chrome">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            <span class="fb-url">facebook.com/JTKIAS</span>
          </div>
          <div class="fb-embed-body" id="fb-embed-body">
            <div
              class="fb-page"
              data-href="${esc(FACEBOOK_PAGE_URL)}"
              data-tabs="timeline"
              data-width=""
              data-height="760"
              data-small-header="false"
              data-adapt-container-width="true"
              data-hide-cover="false"
              data-show-facepile="true">
              <blockquote cite="${esc(FACEBOOK_PAGE_URL)}" class="fb-xfbml-parse-ignore">
                <a href="${esc(FACEBOOK_PAGE_URL)}" target="_blank" rel="noopener">JT KIAS on Facebook</a>
              </blockquote>
            </div>
          </div>
        </div>
        <div class="fb-embed-visit">
          <a class="btn ghost" href="${esc(FACEBOOK_PAGE_URL)}" target="_blank" rel="noopener">Open the full Facebook Page ↗</a>
        </div>
      </div>
    `;
  }
  function wireFacebookFeed(container) {
    const body = container.querySelector('#fb-embed-body');
    if (!body) return;
    // Defensive: if the Facebook SDK fails to load (blocked network, ad
    // blocker, offline) or never actually parses the widget within a few
    // seconds, swap in a plain "visit our Page" card instead of leaving
    // an empty box — and this can never take the rest of the Blog tab
    // down with it, since the try/catch means a Facebook-side failure
    // stays contained to just this one block.
    const fallbackTimer = setTimeout(() => {
      if (body.querySelector('iframe, .fb_iframe_widget iframe')) return; // it worked, leave it alone
      body.innerHTML = `<div class="fb-embed-fallback">
        <p>Couldn't load the live Facebook feed right now (this can happen if Facebook is blocked on your network, or an ad blocker is active).</p>
        <a class="btn ghost" href="${esc(FACEBOOK_PAGE_URL)}" target="_blank" rel="noopener">Open the Facebook Page directly ↗</a>
      </div>`;
    }, 6000);
    try {
      ensureFacebookSDK(() => {
        clearTimeout(fallbackTimer);
        try { window.FB.XFBML.parse(body); } catch (e) { /* left to the timeout fallback above */ }
      });
    } catch (e) { /* left to the timeout fallback above */ }
    if (!wireFacebookFeed._resizeWired) {
      wireFacebookFeed._resizeWired = true;
      let t;
      window.addEventListener('resize', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          try {
            const b = document.getElementById('fb-embed-body');
            if (b && window.FB && currentTabSection() === 'blog' && !parseHash()[1]) window.FB.XFBML.parse(b);
          } catch (e) { /* non-fatal */ }
        }, 400);
      });
    }
  }
  function renderBlog() {
    const mode = getViewModes().blog;
    root.innerHTML = `
      <div class="wrap view">
        <div class="view-header">
          <div>
            <h2>Blog</h2>
            <p>Announcements, Bible study, and behind-the-scenes notes from the studio.</p>
          </div>
          <div style="display:flex;gap:0.6rem;flex-wrap:wrap;align-items:center">
            ${viewToggleHTML('blog')}
            ${tabCtaBtnHTML('blog')}
          </div>
        </div>
        ${facebookFeedHTML()}
        ${mode === 'grid'
          ? `<div class="blog-grid">${DATA.blog.map(blogCardHTML).join('') || emptyState('No posts yet — add rows to data-source/blog.csv.')}</div>`
          : `<div class="blog-list">
              ${DATA.blog.map(b => `
                <div class="blog-row" onclick="jtkiazNav('blog/${b.id}')">
                  <div>
                    <div class="meta">${esc(b.category)}</div>
                    <h3>${esc(b.title)}</h3>
                    <p>${esc(b.excerpt)}</p>
                  </div>
                  <div style="display:flex;align-items:center;gap:0.6rem">
                    ${favBtnHTML('blog', b.id, b.title, b.category)}
                    <span class="date">${esc(b.date)}</span>
                  </div>
                </div>
              `).join('') || emptyState('No posts yet — add rows to data-source/blog.csv.')}
            </div>`}
      </div>
    `;
    wireFacebookFeed(root);
    wireViewToggle(root, 'blog', renderBlog);
    wireFavButtons(root);
  }
  function blogCardHTML(b) {
    return `
      <div class="blog-card" onclick="jtkiazNav('blog/${b.id}')" style="position:relative">
        ${favBtnCornerHTML('blog', b.id, b.title, b.category)}
        <div class="meta">${esc(b.category)}</div>
        <h3>${esc(b.title)}</h3>
        <p>${esc(b.excerpt)}</p>
        <span class="date">${esc(b.date)}</span>
      </div>
    `;
  }
  function renderBlogDetail(id) {
    const post = findBlog(id);
    if (!post) return renderNotFound('blog');
    updateFooterCta('blog', post.title);
    root.innerHTML = `
      <div class="wrap view">
        <span class="back-link" onclick="jtkiazNav('blog')">&larr; All posts</span>
        ${readerToolbarHTML()}
        <div class="reader blog-post framed">
          <div class="reader-meta">${esc(post.category)} · ${esc(post.date)}</div>
          <h2>${esc(post.title)}</h2>
          <div class="body-text">${formatBodyText(post.body)}</div>
          <div class="card-actions">${favBtnHTML('blog', post.id, post.title, post.category)}</div>
          ${engageBarHTML('blog', post.id, post.title)}
        </div>
      </div>
    `;
    wireReaderToolbar(root);
    wireEngageBar(root);
    wireFavButtons(root);
    updateScrollProgress();
  }

  // ---------------- shared bits ----------------
  function emptyState(msg) { return `<div class="empty-state">${esc(msg)}</div>`; }
  function renderNotFound(fallbackTab) {
    root.innerHTML = `<div class="wrap view empty-state">That page doesn't exist. <button class="btn ghost" onclick="jtkiazNav('${fallbackTab}')" style="margin-left:0.8rem">Go back</button></div>`;
  }

  // ---------------- nav wiring ----------------
  tabButtons.forEach(btn => btn.addEventListener('click', () => {
    navigate(btn.dataset.tab);
    document.getElementById('tabnav').classList.remove('open');
  }));
  const hamburger = document.getElementById('hamburger');
  if (hamburger) hamburger.addEventListener('click', () => document.getElementById('tabnav').classList.toggle('open'));

  updatePlaylistBadge();
  ensureFavoritesButton();
  render();
  initPromoPopups();
  // restore whatever queue was left over from last visit (no autoplay —
  // browsers block that without a fresh tap, so it loads ready to resume)
  loadQueueFromStorage();
  if (Player.ids.length) { ensurePlayerDock(); renderPlayerDock(); }
})();
