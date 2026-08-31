/**
 * JTKiaz App — data builder (Node / terminal option)
 * ---------------------------------------------------------------
 * Reads every TAB from ONE Excel workbook — JTKiaz-Content-Workbook.xlsx —
 * and writes js/data.js, the file the actual app loads at runtime.
 *
 * This replaced the old "six separate CSVs" workflow. If you're arriving
 * from an older version of this app: your six CSVs still work as a
 * fallback (see the bottom of this file), but the workbook is now the
 * recommended way to edit content — one file, one set of tabs, nothing
 * to keep in sync by hand. See README.md → "3. Updating content" for
 * the full walkthrough, or use update-content.html if you don't want to
 * install Node.js at all.
 *
 * First time only:
 *   npm install xlsx
 *
 * Every time you update the workbook:
 *   node build-data.js
 * ---------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');

const WORKBOOK_FILE = path.join(__dirname, 'JTKiaz-Content-Workbook.xlsx');
const SRC_DIR = path.join(__dirname, 'data-source'); // legacy CSV fallback only
const OUT_FILE = path.join(__dirname, 'js', 'data.js');

const TAB_NAMES = {
  books: 'Books',
  chapters: 'Chapters',
  poems: 'Poems',
  quotes: 'Quotes',
  music: 'Music',
  blog: 'Blog',
  popups: 'Promo Popups'
};

// ---- load rows either from the workbook (preferred) or legacy CSVs (fallback) ----
let sheets = null;
if (fs.existsSync(WORKBOOK_FILE)) {
  let XLSX;
  try {
    XLSX = require('xlsx');
  } catch (e) {
    console.error('❌ The "xlsx" package isn\'t installed yet. Run:  npm install xlsx');
    process.exit(1);
  }
  const wb = XLSX.readFile(WORKBOOK_FILE);
  sheets = {};
  Object.entries(TAB_NAMES).forEach(([key, tabName]) => {
    const ws = wb.Sheets[tabName];
    if (!ws) {
      console.warn(`⚠️  Tab "${tabName}" not found in the workbook — that section will be empty.`);
      sheets[key] = [];
      return;
    }
    // defval:'' keeps blank cells as '' instead of missing keys, same as the old CSV parser
    sheets[key] = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false }).map(row => {
      const clean = {};
      Object.entries(row).forEach(([k, v]) => { clean[k.trim()] = String(v == null ? '' : v).trim(); });
      return clean;
    });
  });
  console.log('📘 Reading from JTKiaz-Content-Workbook.xlsx');
} else {
  console.log('📄 No workbook found — falling back to data-source/*.csv (legacy mode).');
  sheets = { books: loadCSV('books'), chapters: loadCSV('chapters'), poems: loadCSV('poems'), quotes: loadCSV('quotes'), music: loadCSV('music'), blog: loadCSV('blog'), popups: loadCSV('popups') };
}

// ---- tiny dependency-free CSV parser (handles quoted fields, commas, "" escapes) — legacy fallback only ----
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }

  const headers = rows.shift().map(h => h.trim());
  return rows
    .filter(r => r.some(cell => cell.trim() !== ''))
    .map(r => {
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = (r[idx] || '').trim(); });
      return obj;
    });
}

function loadCSV(name) {
  const file = path.join(SRC_DIR, `${name}.csv`);
  if (!fs.existsSync(file)) {
    console.warn(`⚠️  Missing sheet: ${name}.csv — skipping (this section will be empty).`);
    return [];
  }
  return parseCSV(fs.readFileSync(file, 'utf8'));
}

// popups mini-format: "id:p1;caption:...;image:...;audio:...;video:...;link:...;linktext:..."
// multiple popups on one chapter are separated by "|". See README §8.8.
function parsePopups(raw) {
  if (!raw) return [];
  return raw.split('|').map(chunk => {
    const fields = {};
    chunk.split(';').forEach(pair => {
      const i = pair.indexOf(':');
      if (i === -1) return;
      const key = pair.slice(0, i).trim();
      const val = pair.slice(i + 1).trim();
      if (key) fields[key] = val;
    });
    return fields;
  }).filter(p => p.id);
}

function buildBooks() {
  const books = sheets.books;
  const chapters = sheets.chapters;
  return books.map(b => ({
    id: b.book_id,
    title: b.title,
    author: b.author,
    type: b.type,
    tags: (b.tags || '').split(',').map(t => t.trim()).filter(Boolean),
    summary: b.summary,
    rating: parseFloat(b.rating) || 0,
    reads: parseInt(b.reads, 10) || 0,
    cover: b.cover_image || '',
    themeColor: b.theme_color || '',
    themeFont: b.theme_font || '',
    themeTrack: b.theme_track || '',
    chapters: chapters
      .filter(c => c.book_id === b.book_id)
      .sort((a, c) => parseInt(a.chapter_number, 10) - parseInt(c.chapter_number, 10))
      .map(c => ({
        number: parseInt(c.chapter_number, 10),
        title: c.chapter_title,
        content: c.content,
        wordCount: parseInt(c.word_count, 10) || 0,
        image: c.image || '',
        imageCaption: c.image_caption || '',
        audio: c.audio || '',
        popups: parsePopups(c.popups)
      }))
  }));
}

function buildPoems() {
  const rows = sheets.poems;
  const standalone = [];
  const groups = {};

  rows.forEach(p => {
    const entry = {
      id: p.poem_id,
      collection: p.collection,
      title: p.title,
      body: p.body,
      tags: (p.tags || '').split(',').map(t => t.trim()).filter(Boolean),
      font: p.font || '',
      color: p.color || '',
      sound: p.sound || '',
      // Optional per-poem cover image, e.g. "poem-collections/dust.jpg" under
      // assets/images/. Leave blank to use the collection's default image
      // (set in POEM_COLLECTION_IMAGES in js/app.js) — see README §5/§21.
      image: p.image || ''
    };
    if (p.part_of) {
      if (!groups[p.part_of]) groups[p.part_of] = { id: p.part_of, collection: p.collection, tags: entry.tags, font: entry.font, color: entry.color, sound: entry.sound, image: entry.image, parts: [] };
      groups[p.part_of].parts.push({ ...entry, partNumber: parseInt(p.part_number, 10) || 0 });
    } else {
      standalone.push(entry);
    }
  });

  const multiPart = Object.values(groups).map(g => {
    g.parts.sort((a, b) => a.partNumber - b.partNumber);
    return {
      id: g.id,
      collection: g.collection,
      title: g.parts[0].title.replace(/\s*—\s*Part\s*\d+$/i, ''),
      tags: g.tags,
      font: g.font,
      color: g.color,
      sound: g.sound,
      image: g.image,
      isMultiPart: true,
      parts: g.parts
    };
  });

  return [...standalone, ...multiPart];
}

function buildQuotes() {
  return sheets.quotes.map(q => ({
    id: q.quote_id,
    text: q.text,
    origin: q.origin,
    tags: (q.tags || '').split(',').map(t => t.trim()).filter(Boolean)
  }));
}

function buildMusic() {
  return sheets.music.map(t => ({
    id: t.track_id,
    title: t.title,
    type: t.type,
    source: t.source,
    src: t.embed_url_or_file,
    description: t.description,
    // Optional per-track artwork, e.g. "music/tracks/dust.jpg" under
    // assets/images/. Leave blank to fall back to a shared image for the
    // track's `type`, then to a generic default — see README §7/§21.
    artwork: t.artwork || '',
    // Optional richer song info for the Music tab's "What's New" overlay
    // (js/app.js → latestSongHTML()) — all blank-safe, add whichever
    // columns you actually want to fill in for a given track:
    //   artist    — who's credited on the track
    //   producer  — who produced/mixed it
    //   vision    — one line on why the song exists / what it's about
    //   about     — a short paragraph: the story behind it, where/when
    //               it was made, who's featured — richer than `description`
    //   mood      — a couple of vibe words, e.g. "late-night, reflective"
    artist: t.artist || '',
    producer: t.producer || '',
    vision: t.vision || '',
    about: t.about || '',
    mood: t.mood || ''
  }));
}

function buildBlog() {
  return sheets.blog
    .map(p => ({
      id: p.post_id,
      title: p.title,
      category: p.category,
      date: p.date,
      excerpt: p.excerpt,
      body: p.body
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

// ---- Promo Popups (new — README §17) ----
function buildPopups() {
  return (sheets.popups || [])
    .filter(p => p.popup_id && String(p.active).toLowerCase() !== 'no' && String(p.active).toLowerCase() !== 'false')
    .map(p => ({
      id: p.popup_id,
      type: p.type || 'general',
      title: p.title,
      message: p.message,
      image: p.image || '',
      sound: p.sound || '',
      delaySeconds: parseInt(p.delay_seconds, 10) || 30,
      repeatEverySeconds: parseInt(p.repeat_every_seconds, 10) || 0,
      showOn: (p.show_on || 'all').split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
      linkType: (p.link_type || 'none').toLowerCase(),
      linkId: p.link_id || '',
      linkLabel: p.link_button_label || '',
      whatsappMessage: p.whatsapp_message || ''
    }));
}

const data = {
  generatedAt: new Date().toISOString(),
  books: buildBooks(),
  poems: buildPoems(),
  quotes: buildQuotes(),
  music: buildMusic(),
  blog: buildBlog(),
  promoPopups: buildPopups()
};

const out = `/**
 * AUTO-GENERATED by build-data.js — do not edit by hand.
 * Edit JTKiaz-Content-Workbook.xlsx (all tabs), then run: node build-data.js
 * Generated: ${data.generatedAt}
 */
window.JTKIAZ_DATA = ${JSON.stringify(data, null, 2)};
`;

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, out, 'utf8');

console.log('✅ js/data.js rebuilt');
console.log(`   Books: ${data.books.length} · Poems: ${data.poems.length} · Quotes: ${data.quotes.length} · Music: ${data.music.length} · Blog posts: ${data.blog.length} · Promo popups: ${data.promoPopups.length}`);
