# JTKiaz App

A single web app for Hippy Vibes International Studio — Books, Poems, Quotes, Music
and Blog in one place, run almost entirely from an Excel file.

Palette: **Gold / Brown / Silver / Black / White.** Type: Fraunces (display) +
Work Sans (body) + IBM Plex Mono (labels/data). Signature motif: the small
woven zigzag "seam" — a nod to woven cloth — used as dividers and as the
active-tab marker. No frameworks, no build tool required to *run* it — only to
*update the content*.

---

## 1. Run it right now

No install needed.

1. Open the `jtkiaz-app` folder.
2. Double-click `index.html`. It opens in your browser and works fully —
   Books, Poems, Quotes, Music and Blog are already loaded with sample content.
3. Click around: open a book, read chapter 1, watch chapter 2 unlock.

That's it — it's ready to run. Everything below is about (a) swapping in your
real content and (b) putting it online so other people can use it.

---

## 2. The folder map

```
jtkiaz-app/
├── index.html                       ← the whole app shell (don't usually need to touch this)
├── update-content.html               ← browser-only tool: upload the workbook, download data.js
├── admin-stats.html                  ← PRIVATE, unlisted: your real view/like counts (§8.10, §14.1)
├── JTKiaz-Content-Workbook.xlsx      ← YOUR ONE FILE — every tab of content lives here
├── css/style.css                      ← all styling — colors, fonts, layout, light/dark palettes
├── css/theme.css                      ← safe place to swap fonts/colors (§8.5)
├── js/app.js                           ← all app behavior — tabs, chapter unlocking, filters, playlist, promo popups
├── js/data.js                          ← AUTO-GENERATED. This is what the app actually reads.
├── build-data.js                       ← the script that turns the workbook into js/data.js (Node option)
├── data-source/                        ← legacy: the old six-CSV format, kept only as a fallback (§3)
│   ├── books.csv / chapters.csv / poems.csv / quotes.csv / music.csv / blog.csv / popups.csv
└── assets/
    ├── images/covers/            ← book cover images
    ├── images/chapters/          ← chapter hero images
    ├── images/popups/            ← promo pop-up images (§17)
    ├── images/poem-collections/  ← one cover image per poem collection, + per-poem overrides (§5, §22)
    ├── images/music/              ← the Music tab hero banner + optional per-track artwork (§7, §22)
    ├── images/branding/           ← the JTK logo mark + favicon (§22)
    └── audio/                ← self-hosted mp3s, including the promo pop-up sound (§17) and any background/ambient tracks (§8.9.3)
```

You will spend almost all of your time in **`JTKiaz-Content-Workbook.xlsx`** —
one file, seven tabs, everything the app shows.

---

## 3. Updating content — the one workbook

**The one thing to understand:** `index.html` never reads the workbook
directly. It reads `js/data.js` — a plain-JS file that gets *generated from*
the workbook. Editing the workbook and reopening `index.html` will never show
a change on its own; something has to rebuild `js/data.js` in between.
That's what both options below do — pick whichever is easier for you.

**What changed from the old version of this app:** content used to live in
six separate CSV files that you had to load into `update-content.html` one
at a time, every single update, even the ones you didn't touch. That's now
one file — `JTKiaz-Content-Workbook.xlsx` — with **seven tabs**, one per
sheet: **Books, Chapters, Poems, Quotes, Music, Blog, Promo Popups.** Same
columns, same rules, same everything — just one file to keep track of.
Open it in Excel (or Google Sheets, then File → Download → Microsoft Excel
.xlsx to get it back into workbook form), click between the tabs at the
bottom, edit, save.

### Option A — no Node, no terminal (recommended if you're not sure)
1. Edit the workbook in Excel — click the tab at the bottom for the section
   you're changing (Books, Chapters, Poems, Quotes, Music, Blog, or Promo
   Popups) — then **File → Save** (keep it as `.xlsx`).
2. Open **`update-content.html`** in your browser (there's also a link to it
   in the app's footer).
3. Click the upload box and choose `JTKiaz-Content-Workbook.xlsx` — that's
   the only file you need, every time.
4. Check the counts shown match what you expect (e.g. chapters went up by
   however many you added).
5. Click **Download data.js**, then move the downloaded file into your `js`
   folder, replacing the old one.
6. Refresh `index.html`. Done.

### Option B — with Node.js installed
1. Save your edited workbook as `JTKiaz-Content-Workbook.xlsx` in the app's
   root folder (same place `index.html` lives), overwriting the old one.
2. **First time only:** open a terminal in the `jtkiaz-app` folder and run
   `npm install xlsx` (installs the small library that reads Excel files —
   one-time, needs an internet connection).
3. Every time you update, run:
   ```
   node build-data.js
   ```
   This rebuilds `js/data.js` from every tab of the workbook and prints a
   summary line confirming how many books/poems/quotes/tracks/posts/pop-ups
   it found — check that number changed the way you expected.
4. Refresh `index.html` in your browser (or redeploy, if it's already online).

**Requires:** [Node.js](https://nodejs.org) installed once on your computer
(free, takes 2 minutes).

**Still on the old six-CSV workflow?** Both `update-content.html` and
`build-data.js` still support it as a fallback — the six CSVs in
`data-source/` keep working exactly as before if the workbook file isn't
present, and `update-content.html` has a "Still on the old workflow?" link
that reopens the six-file uploader. There's no rush to migrate, but once you
do, delete `JTKiaz-Content-Workbook.xlsx` is what the app looks for first —
if it's present, it always wins over the CSVs.

### If you edited the workbook and nothing changed
This is almost always one of these — check in order:
1. **You skipped the rebuild step.** Saving the workbook alone does nothing —
   you must run Option A or Option B above afterward.
2. **The counts printed/shown didn't change.** If `node build-data.js` (or
   `update-content.html`'s summary) shows the same numbers as before, your
   edit didn't actually save, or you edited a copy in the wrong folder —
   confirm the file next to `index.html` has your new rows by reopening it.
3. **A `book_id` mismatch.** New chapters on the Chapters tab only show up
   under a book if their `book_id` column exactly matches a row on the Books
   tab (same spelling, same case).
4. **A tab got renamed.** `update-content.html` and `build-data.js` look for
   the tabs by exact name — Books, Chapters, Poems, Quotes, Music, Blog,
   Promo Popups. If a tab name changed, that section reads as empty.
5. **Browser cache.** Rare for local files, but if you're still not seeing
   it, hard-refresh (Ctrl/Cmd+Shift+R) rather than a normal refresh.

### What each tab controls

| Tab | Controls | Key columns |
|---|---|---|
| `Books` | one row per book | `book_id`, `title`, `type` (Fiction/Non-Fiction), `tags`, `summary`, `rating`, `cover_image`, plus optional `theme_color`/`theme_font`/`theme_track` (§8.6) |
| `Chapters` | one row per chapter | `book_id` (must match a row in Books), `chapter_number`, `chapter_title`, `content`, plus optional `image`/`image_caption`/`audio`/`popups` (§8.7–8.8) |
| `Poems` | one row per poem, or per *part* of a multi-part piece | `collection` (Micro/Short/Long/Spoken Word), `title`, `body`, `part_of` (see below), plus optional `font`/`color`/`sound`/`image` (§8.6, §5, §22 — `image` overrides that one poem's cover; leave blank to use the shared collection cover) |
| `Quotes` | one row per quote/proverb | `text`, `origin`, `tags` (comma-separated — use exactly `Old Testament`, `New Testament`, or `African` to surface those as filter chips first, §6) |
| `Music` | one row per track | `title`, `type`, `source` (`local`/`audiomack`/`soundcloud`), `embed_url_or_file`, plus optional `artwork` (§7.1, §22 — overrides that one track's card/queue image; leave blank to use a shared image for the `type`, or the generic fallback) |
| `Blog` | one row per post | `title`, `category`, `date`, `excerpt`, `body` |
| `Promo Popups` | one row per timed pop-up ad | `popup_id`, `active`, `title`, `message`, `image`, `delay_seconds` — full guide in §17 |

**Multi-part poems** (like your "Swoon" and "Dodge" pieces): give every part
the same `part_of` value (e.g. `swoon`), a `title` like `Swoon — Part 1`, and
a `part_number`. The build script groups them automatically into one poem
with a part-switcher — that's already set up and working with your two
pieces as sample data.

### Adding cover images
Drop image files into `assets/images/covers/` and put the filename (e.g.
`covers/my-book.jpg`) in the `cover_image` column. Right now covers render as
a clean gold-on-brown plaque with the book's genre — that's an intentional
placeholder, not a bug, so the app looks finished even before you've shot any
cover art.

---

## 4. Books — how the unlock mechanic works

- Chapter 1 of every book is unlocked by default.
- Finishing a chapter (opening it) unlocks the next one automatically.
- Progress is saved in the reader's browser (`localStorage`) — it's personal
  to their device, not shared or synced anywhere. No account system, no
  server, no cost.
- Right now it's fully free. Your 3 books × 10 chapters are already wired up
  as sample rows in `the Books tab`/`the Chapters tab` — replace the placeholder
  `[SAMPLE TEXT]` content with your real chapters and re-run the build.

### Setting up a paywall later (ads or diamonds/coins)
The unlock function lives in one place — `markChapterRead()` in `js/app.js`.
When you're ready:
- **Ad-gated unlock:** before unlocking the next chapter, show a rewarded ad
  (e.g. Google AdSense/Ad Manager for web, or a rewarded-video SDK) and only
  call the unlock once the ad's completion callback fires.
- **Diamonds/coins:** you'd need a lightweight backend (even a free tier like
  Supabase or Firebase) to hold each reader's coin balance server-side —
  `localStorage` alone can be edited by the reader, so it isn't safe for
  anything with real monetary value. The flow: reader buys coins (Stripe /
  Paystack / a Zimbabwe-friendly gateway like Paynow or EcoCash — confirm
  current availability, this changes) → coins stored server-side → "unlock
  chapter" spends coins server-side → app fetches unlocked-chapter list from
  the server instead of `localStorage`.
- **Straight subscription/paywall:** same backend requirement — a login,
  a subscription record, and the app checking that record before unlocking
  chapters. Good order of operations: launch free, build an audience, then
  add the backend once you know which books justify it.

---

## 5. Poems — making them worth returning to

Set up now:
- Filter by **Micro / Short / Long / Spoken Word**, or a **"Surprise me"**
  button that jumps to a random poem — both already working.
- **Every poem card and the poem's own page carries an image.** By default
  it's a shared cover per collection (Micro poems all get the "Micro"
  cover, Spoken Word pieces all get the "Spoken Word" cover, etc.) — set
  once in `POEM_COLLECTION_IMAGES` near the top of `js/app.js`, nothing to
  repeat per poem. If you want one specific poem to stand out with its own
  photo instead, add an `image` value for that row in `the Poems tab`
  (same `covers/…`-style relative path convention as book covers) and that
  poem uses it instead of the collection default. See §22 for exact
  pixel sizes.
- **The grid reshuffles on every visit.** With 300+ poems, always showing
  the same handful first buries the rest — so the poem grid (and the poem
  list view) picks a fresh random order each time you open the Poems tab
  or tap a collection chip, so different pieces surface over time.
- **Grid or list, your choice.** A "▦ Grid / ☰ List" toggle sits next to
  "Surprise me" (remembered per device). Grid is the big visual cards;
  List is a tighter single-column scroll with a small thumbnail — better
  for someone who wants to scan titles fast rather than browse images.
  The same toggle now exists on **every** tab that lists content — Books,
  Music, Quotes, and Blog too (each remembers its own choice separately).
- Multi-part spoken word pieces (Swoon, Dodge) read like a mini chapter
  experience without the unlock mechanic — since poems are short, gating
  them the same way books are gated would feel stingy; the collections
  themselves are the draw.
- **Never have to back out to the grid between poems.** Every open poem
  shows a small "bearing" line (e.g. *"Spoken Word · piece 4 of 17"*), a
  row of collection chips so you can jump straight to another type, and
  two rows of navigation buttons — **← Previous poem / Next poem →** to
  move within the current type, and **▲ Previous type / ▼ Next type** to
  hop to a different collection (landing on a random piece there). The
  tab bar up top (Home/Books/Poems/…/Music/Blog) and the theme/playlist
  buttons stay visible the whole time too — nothing is ever a dead end.
- **Same thing works with arrow keys** once a poem is open: **←/→** moves
  between poems in the current type, **↑/↓** jumps to the previous/next
  type. Wraps around at the ends either way.

Ideas to make people come back:
- **A daily poem**, styled the same way "Quote of the day" already works
  (deterministic by date, so it's the same for everyone that day and
  changes at midnight) — cheap to add, gives people a reason to open the
  app daily.
- **"Read a random Micro poem"** as a genuinely 10-second habit loop —
  micro poems are the natural daily-use format.
- **Collections as mini releases** — instead of publishing every poem at
  once, drop a themed collection (5–10 poems) every week or two and
  announce it on the Blog tab. Scarcity + a release cadence beats a static
  library for return visits.

Monetizing poems:
- **"Name your price" collections** — offer a themed poem collection as a
  free read in-app, and a downloadable/printable PDF version (with your
  own layout and cover) for a small price via Gumroad or Payhip — both let
  you sell digital downloads with no upfront cost.
- **Sponsor a collection** — since these are short and visual, a single
  brand/sponsor credit per themed collection is a realistic, low-effort
  income line once you have real traffic.
- **Bundle with the spoken word audio** — the written poem free in-app,
  the *recorded spoken word version* as the paid or ad-supported product on
  the Music tab. That reuses work you've already done (Swoon/Dodge) as two
  monetizable formats from one piece of writing.

---

## 6. Quotes

Already working: tagged Old Testament / New Testament / African proverbs and
quotes, a "Quote of the day" (same quote for everyone, all day, changes at
midnight — no server needed), a copy button on every card for easy sharing
to WhatsApp/Instagram, and a ❤ Favorites toggle (§19) on every one.

**Built for scale — 1000+ quotes.** Like Poems and Music, the Quotes grid/
list reshuffles its order on every visit, so a large library doesn't always
show the same handful first.

**Tag filter, including Old Testament / New Testament / African.** A row of
filter chips sits above the list — "All" plus every tag actually present in
`the Quotes tab`'s `tags` column. If a quote's `tags` cell includes the exact
text `Old Testament`, `New Testament`, or `African`, that chip is surfaced
first (in that order), with every other tag you use following alphabetically.
Use those exact spellings in the `tags` column (comma-separated, same as
poem/book tags) for them to appear as their own filter chips — any other tag
works too, it just won't jump the queue.

**Every quote now opens its own page.** Tapping a quote (in the grid, the
list, or the Quote of the Day itself) opens it full-size, with **← Previous
quote / Next quote →** buttons (and the left/right arrow keys) to keep moving
through the same filtered set without ever going back to the grid — plus the
same tag chips right there, so jumping to a different theme is one tap.
Copy and ❤ Favorite both work identically on the detail page.

**Design — an "essene scroll" look.** The Quote of the Day and the full quote
page both get a rolled-parchment treatment: a gold/brown "rod" bar top and
bottom, a woven-look diagonal band, and a fine paper-grain texture — all
built from the app's existing color tokens (`--gold`, `--brown`, `--ink`,
`--parchment`, etc. in `css/style.css`), so it re-colors correctly in dark
mode automatically, the same way the rest of the app already does. No extra
image files needed for this — it's pure CSS.

Idea: export the quote-of-the-day card as a shareable image (Canva template
or a small canvas-based generator) — quotes are the most shareable format
you have, worth making it one tap to post.

---

## 7. Music — where to actually host the audio

The tab opens with a single wide hero banner ("The Sound Room" by default)
for a bit of pizzazz before the tracks — image, title and subtitle are all
set in one place: `MUSIC_HERO_IMAGE`, `MUSIC_HERO_TITLE`, and
`MUSIC_HERO_SUBTITLE` near the top of `js/app.js`. See §22 for the exact
image size.

**Recommendation: Audiomack as your primary host, embedded directly in the
Music tab.**

| | Audiomack | SoundCloud | Self-host (`assets/audio/`) |
|---|---|---|---|
| Upload cost | Free, unlimited | Free tier caps at ~2 hrs total | Free, but you're paying for it in your own storage/bandwidth |
| Best for | African/hip-hop/spoken-word discovery — strong regional charts and playlists | Wider distribution tools, waveform comments, official links out to Spotify/Apple Music (paid tier) | Full control, but no discovery, no player polish, and large files slow the page down |
| Embed in your app | Yes — paste the embed URL into `the Music tab`, already wired up | Yes — same column, same mechanism | Yes — plays through the same player, already wired up too |

Practical setup: put your finished tracks on **Audiomack** (free, unlimited,
plays well for African/spoken-word audiences), copy the embed URL for each
track, and paste it into the `embed_url_or_file` column in `the Music tab` in the
row where `source` is `audiomack`. Reserve local self-hosting (`assets/audio/`)
for very short clips only — anything more than a minute or two will make
`index.html` slow to load if you're not on a proper server.

Two sample rows are already set up for "Swoon" and "Dodge" — just replace
`PASTE_AUDIOMACK_EMBED_URL_HERE` with the real embed link once uploaded.

### 7.1 With 30+ songs: browsing, artwork, and grid/list

- **The Music tab now opens in Grid view** by default — square artwork
  cards, one per track, with a play icon that appears on hover/tap. Switch
  to **List view** (same "▦ Grid / ☰ List" toggle used on Poems and Books)
  for the fuller layout with description text and the view/like counts.
- **Track order reshuffles on every visit**, exactly like the Poems grid —
  with 30+ songs, the same handful always leading buries the rest.
- **Artwork**: give each track its own image via the optional `artwork`
  column on `the Music tab` (same `music/…`-style relative path convention
  as poem/book images). No column filled in? It falls back to a shared
  image for that track's `type` (set once in `MUSIC_TYPE_IMAGES` in
  `js/app.js` — empty by default) and finally to one generic placeholder
  (`MUSIC_ARTWORK_FALLBACK`). See §22 for exact pixel sizes.

### 7.2 The player, the queue, and playing in the background

Every "▶ Play" or "+ Queue" button — on a track card, a track's row, or the
"▶ Play all" / "🔀 Shuffle play" buttons at the top of the Music tab — feeds
into **one shared player** that lives outside the page content, at the
bottom of the screen, the moment the first track starts:

- **It survives switching tabs.** The player is mounted once, outside the
  area that gets redrawn when you tap Books, Poems, Quotes, etc. — so
  moving around the app never stops or resets it. Music keeps playing (or
  stays paused right where it was) while you read a chapter, browse quotes,
  or check the Facebook feed.
- **Minimize / expand.** It opens as a full "Now Playing" panel the first
  time you hit play — artwork, description, the actual player surface, and
  the queue list — with a "﹀ Minimize" button that collapses it down to a
  slim bar (artwork thumbnail, title, prev/pause/next). Tap the mini bar
  to expand it again. This is the closest a plain web app (no app-store
  install) can get to a real "mini player" — full background *audio*
  playback with the screen off, the way a native app does, isn't something
  a website can do; see the note below for what that means for Audiomack
  tracks specifically.
- **Build your own queue.** "▶ Play" starts a track immediately (adding it
  to the queue if it isn't already there); "+ Queue" adds it to the end
  without interrupting whatever's currently playing. Inside the expanded
  player, every queued track can be reordered with ↑/↓, jumped to directly,
  or removed with ✕ — in any order, as many as you like. The queue is
  remembered (in the browser's local storage) even across a page reload.
- **Self-hosted tracks (`source: local`)** get full playback control —
  play/pause, a progress bar, auto-advance to the next queued track when
  one ends.
- **Audiomack/SoundCloud embeds** play inside the same persistent player
  surface, but — because they're a third party's own embedded player
  running in an iframe — this app can't reach in and press their internal
  play button for you, or truly keep audio going once the browser tab
  itself is backgrounded/screen-locked (that's a restriction Audiomack and
  every other embed put in place, not something specific to this app).
  What *is* guaranteed: switching between tabs inside the app (Books,
  Poems, Music, etc.) **never** stops or reloads an Audiomack track that's
  already playing — the embed genuinely keeps going in the background as
  long as the browser tab itself stays open. The player also appends
  `&autoplay=true` when it loads a new embed track, so in most browsers
  hitting "▶ Play" / "Next" starts it without a second tap — but if a
  particular browser blocks that, the embed's own play button (visible
  inside the expanded player) always works as a fallback.

**In short:** within the app, across every tab, music now behaves like a
proper playlist player. Once the phone's screen locks or the browser tab
itself closes, an Audiomack track's playback follows Audiomack's/the
browser's own rules — same as it would on any other website.

---

## 8. Blog

Works like a simple newsletter: title, category (Announcement / Bible Study /
free-form), date, and a body. Add a row to `the Blog tab`, run the build, done.
Since this is your creative/free-write zone, there's intentionally no extra
structure imposed on the body text — write it the way you'd write a
newsletter.

---

## 8.11 Facebook Page — live feed on the Blog tab

The Blog tab opens with a **"Live from Facebook"** panel — an embed of your
actual [JT KIAS Facebook Page](https://www.facebook.com/profile.php?id=61590231961322)
timeline. It's Facebook's own official "Page Plugin," pointed at your page
URL, with **no login, API key, or access token required** since it only
shows public posts. Whatever you post on the Facebook Page shows up on the
Blog tab automatically, with no copying, no manual sync, nothing to remember.

**It's now the "immersive" version.** The panel loads via Facebook's own JS
SDK instead of a fixed-size iframe, so it genuinely resizes with the
screen — narrow and tall on a phone, wide and roomy on a desktop — instead
of being stuck at one fixed width. A thin grey "browser chrome" bar sits on
top (three dots + a `facebook.com/JTKIAS` address pill) so it visually reads
as its own little window into Facebook, not just another card on the page.
A "Open the full Facebook Page ↗" button sits underneath in case someone
wants to leave the app and visit the real thing.

Below that live panel, the **curated blog list stays exactly as before** —
posts you've written directly into `the Blog tab`/`blog.csv`. The two are
independent: the Facebook panel is a live mirror of your Page, the list
below it is your own hand-picked posts (useful for anything you want
reformatted, expanded, or that didn't start life as a Facebook post).

**Being fully honest about the limits of "sync":** what you *can't* do
without a real backend is have a Facebook post automatically turn into a
new *row* in the workbook (with its own dedicated page, `#/blog/id` URL,
share buttons, etc.) — that direction needs either a paid automation tool
(e.g. [Zapier](https://zapier.com) or [Make.com](https://make.com), which
can watch your Page for new posts and write a row into a connected Google
Sheet you then paste into the workbook) or genuine server code with a
Facebook access token. The live embed above is the honest, zero-cost,
zero-maintenance version of "when I post, it shows up here" — it's real,
automatic, and needs nothing from you after this setup, it just isn't a
*new page per post* the way a workbook row is.

If you ever change your Facebook Page (new URL, new Page ID), update
`FACEBOOK_PAGE_URL` near the top of `js/app.js`.

---

## 8.5 Changing the fonts (or colors)

Open **`css/theme.css`** — it's a separate, empty-by-default file loaded
right after the main stylesheet, specifically so you can change how things
look without touching `css/style.css` (where a stray typo could break the
whole layout).

Inside it you'll find three ready-made font pairings, each commented out:

- **Option A — Playfair Display + Lato:** classic editorial, more formal.
- **Option B — Spectral + Karla:** warmer and literary, softer on long reads.
- **Option C — Space Grotesk + Inter:** modern and punchier.

To use one, delete the `/*` and `*/` around that block (only enable one at a
time), save, and refresh `index.html` — no build step needed, CSS applies
immediately. The same file has a small block for nudging the gold/brown/
silver values if you ever want to shift the palette itself. Want a font not
listed? Any [Google Fonts](https://fonts.google.com) name works — just keep
the same two roles (`--font-display` for headings, `--font-body` for
paragraph text).

The whole app now runs a burnished-bronze/papyrus palette by default
(`--ink`, `--parchment`, `--brown`, `--gold`, `--silver` in `css/style.css`)
with more visible borders (a "double border" frame around the hero, book
cards, chapter list, reader, quote-of-the-day, and media popups), a subtle
papyrus-grain texture on the page background, and small line-icons next to
each tab. None of that lives in `theme.css`, so your font/color overrides
still apply on top of it exactly as before.

---

## 8.6 Giving each book its own look, sound and mood

`the Books tab` has three new optional columns — leave any of them blank and the
book just uses the app's defaults:

| Column | What it does |
|---|---|
| `theme_color` | A hex color (e.g. `#8a5a2b`) used as that book's accent everywhere you're reading it — the progress bar, chapter numbers, the reader's frame, the "next chapter" button, its engagement bar's like button. |
| `theme_font` | Any [Google Fonts](https://fonts.google.com) name (e.g. `Spectral`, `Playfair Display`, `Space Grotesk`). Loads automatically the first time that book is opened and re-styles the chapter body text and heading — so *Ash and Amber* can read like a warm romance serif while *The Bantu Book* reads in a punchier modern sans, without touching CSS. |
| `theme_track` | A `track_id` from `the Music tab`. Now wired to a **🎧 Listen while you read** button on that book's chapter pages (§8.9.3) — as long as the referenced track has `source = local`. Never autoplays (autoplay-with-sound is blocked by every mobile browser and is bad practice) — it's entirely user-triggered; the sample data points *Bible is Amazing* at `t001`. |

The three sample books already demonstrate three different combinations —
open each one's Chapter 1 to see the accent color and font change.

Poems work the same way, with `font`, `color` and `sound` columns in
`the Poems tab` — `sound` is a path to a short ambient audio file
(`assets/audio/...`); if set, a **▶ Play ambient sound** button appears under
the poem, user-triggered (never autoplaying), and loops until paused. The
sample data gives each collection (Micro/Short/Long/Spoken Word) its own
font and color so the four collections feel distinct — copy that pattern
per-poem if you want individual pieces to stand apart from their collection.

---

## 8.7 Chapter images, default images, and the frame template

`the Chapters tab` has four new optional columns:

| Column | What it does |
|---|---|
| `image` | Path under `assets/images/chapters/`, e.g. `chapters/my-chapter.jpg`. Shows as a framed 16:9 hero image at the top of the chapter. |
| `image_caption` | Small caption overlaid on the image's bottom edge. Optional even if `image` is set. |
| `audio` | Reserved for a per-chapter sound effect/ambient track file — not auto-played; wire a button to it the same way `poem-sound-btn` works if you want one per chapter. |
| `popups` | Inline pop-ups inside the chapter text — see §8.8. |

**If you leave `image` blank**, the chapter automatically falls back to that
book's `cover_image` — and if there's no cover either, it shows the same
bronze woven-pattern placeholder the book cards use, so nothing ever looks
broken or empty. That's the "default image" behavior, and it's automatic —
you don't set anything for it.

**The frame is one fixed template, and yes, any image size works** — the
image is `object-fit: cover` inside a fixed 16:9 box with the papyrus double
border, so you drop in whatever you shot and the app crops it to fit
consistently. For the sharpest result on all screens, though, see the exact
pixel sizes in §16.

---

## 8.8 Pop-ups inside the reading text (image / audio / video / link)

You can drop a small marker anywhere inside a chapter's `content` cell —
`{{pop:p1}}` — and readers see a small bronze diamond (◆) at that exact spot
in the sentence. Tapping it opens a pop-up card with whichever media you
gave it, then closes right back to the same place in the text — no page
reload, no losing your spot.

Define what each marker shows in the `popups` column, using this format:

```
id:p1;caption:The verse this chapter opens on.;image:chapters/psalm-22.jpg
```

- Separate **fields** with `;` — available fields: `id`, `caption`, `image`,
  `audio`, `video`, `link`, `linktext`.
- Separate **multiple pop-ups** on the same chapter with `|`.
- `image` and `audio` are paths under `assets/images/` and `assets/audio/`
  the same way covers and chapter images are. `video` is a full embeddable
  URL (e.g. a YouTube `/embed/...` link) and renders as a responsive 16:9
  player. `link` is any URL and renders as a button — set `linktext` to
  customize its label (defaults to "Open link").
- You can combine fields freely — image + caption + audio in one pop-up,
  or just a caption and a link in another.

Example row (already in the sample data, `book001` chapter 1):

```
id:p1;caption:The verse this chapter opens on — Psalm 22:1.;image:chapters/psalm-22.jpg|id:p2;caption:A field recording of the prayer read aloud.;audio:assets/audio/psalm-22-read.mp3
```

with `{{pop:p1}}` and `{{pop:p2}}` placed inside that chapter's `content`.
Open **Bible is Amazing → Chapter 1** in the app to see both working.

---

## 8.9 The reading experience — layout, spacing, font size, fullscreen

Already set up, no configuration needed:

- **Comfortable measure.** Chapter and blog text is capped at `--measure`
  (66 characters wide) in `css/style.css` — not full-bleed edge-to-edge —
  so lines stay easy to track on wide screens, with generous 1.85 line-height.
  On phones it expands to the full width automatically (there's no room to
  keep a fixed measure on a narrow screen).
- **A sticky reading toolbar** sits just under the header on every chapter
  and blog post: **A− / A / A+** to shrink, reset, or grow the text size
  (saved in the reader's browser, so it persists next visit), and a
  **⤢ Fullscreen** button that hides the header/footer and expands the
  page to fill the screen — using the real Fullscreen API where supported,
  and a CSS-only fallback (Safari on iPhone doesn't support the Fullscreen
  API for the whole page, so it gets the fallback automatically).
- **A scroll progress bar** — the thin bronze line at the very top of the
  screen — fills as the reader scrolls down any page.
- **Chapter header** shows the book title, chapter number of total, word
  count, and an estimated reading time (words ÷ 200wpm) automatically.

To change the measure width, edit `--measure` in `css/style.css`. To change
line-height, edit `.reader .body-text` in the same file.

---

## 8.10 Views, likes, share and comments

Every chapter, poem, track, and book now ends with an **engagement bar**: a
❤ like button, share buttons (WhatsApp / X / Facebook / Copy link / native
share sheet on phones that support it), and a **💬 Comment via WhatsApp**
button.

**Views and likes are still counted for real — they're just not shown to
readers.** Every chapter/poem/track/book/blog post silently records a view
the moment it opens, and a like when someone taps ❤ (once per device — it
just says "❤ Liked" after that, no running number). Nothing about this
updates live in front of a visitor. The counts themselves live on
[CountAPI](https://countapi.xyz), a free, no-signup hit-counter API, keyed
by `COUNTAPI_NAMESPACE` in `js/app.js` — same setup as before, just no
longer echoed back onto the page.

**To see the real numbers, open `admin-stats.html`** — a separate, unlisted
page (not in the tab nav, no link to it anywhere in the app) that lists
every book, chapter, poem, track and blog post with its live view and like
counts, plus per-section and grand totals. See §14.1 below for the honest
privacy caveat on that page — it's "unlisted," not password-protected.

1. Open `js/app.js` and find `COUNTAPI_NAMESPACE` near the top.
2. Change `'jtkiaz-app-v1'` to something unique to you (anything works —
   it just needs to not collide with someone else's namespace on the free
   shared service). Do this **once**, before you share the app publicly —
   changing it later resets all your counts back to zero.
3. **Copy the same namespace into `admin-stats.html`** (there's a matching
   `COUNTAPI_NAMESPACE` constant near the top of its `<script>` block) — if
   the two don't match, the stats page will show all zeros even though the
   live app is recording correctly.

**Comments route to your WhatsApp, on purpose — there's no database.** A
real public comment section (something everyone can see) needs a backend
to store and moderate comments, which is exactly the kind of cost/complexity
this app is built to avoid. Instead, "Comment" opens a pre-filled WhatsApp
chat to you, naming the exact chapter/poem/track — so every comment reaches
you directly and you can reply personally, which for a small, personal
studio is arguably better than a public comment thread anyway. If you later
want genuine public comments, a lightweight option is
[giscus](https://giscus.app) (free, backed by GitHub Discussions) — that's
a bigger change than fits here, but it's a realistic next step.

**Your WhatsApp number is already set** to `263787726262` (from
`https://wa.me/263787726262`) — it's the `WHATSAPP_NUMBER` constant right
above `COUNTAPI_NAMESPACE` in `js/app.js`, used everywhere in the app: the
comment button, the footer CTA (§16.5), promo pop-ups, and the playlist
sponsor message. If it ever needs to change, edit that one constant —
digits only, country code first, no `+` or spaces.

---

## 8.9.1 Formatting your text — spacing, headings, bold and italic

Chapters and blog posts now support a small, plain-text set of conventions
— nothing to click, just type it straight into the workbook cell:

| Type this | You get |
|---|---|
| A blank line between two lines | A new paragraph, with real spacing above/below |
| One line break (no blank line) | A line break *within* the same paragraph |
| `**important**` | **important** (bold) |
| `*whispered*` | *whispered* (italic) |
| `# A short heading` on its own line | A small styled heading inside the text |
| `---` on its own line, by itself | A centered "◆ ◆ ◆" scene/section break |

Nothing else is interpreted as code — everything you type is shown as
plain text first, so there's no risk of stray HTML or a broken layout from
a pasted symbol. This applies to **chapter content** and **blog post
body**. Poems are treated differently on purpose: every line break in a
poem is meaningful (it's verse), so poems only pick up `**bold**` and
`*italic*` — line breaks in poems always render exactly as typed.

---

## 8.9.2 Dark mode

A 🌙/☀️ toggle sits in the header next to the playlist button. Tapping it
swaps the whole app to a dark "Midnight Bronze" palette — dark canvas, warm
parchment-colored text, brighter gold accents for contrast — and remembers
the reader's choice on their device for next time. Every color in
`css/style.css` is a variable, so the swap in the `[data-theme="dark"]`
block at the top of that file re-skins the entire app in one place; there's
nothing to keep in sync piece by piece.

To adjust the dark palette, edit the `[data-theme="dark"]` block near the
top of `css/style.css` — same variable names as the light palette
(`--ink`, `--parchment`, `--gold`, etc.), just different values. Book/chapter
cover placeholders (the textured gradient shown when there's no cover image
yet) deliberately stay the same dark bronze in both modes, via the separate
`--cover-from`/`--cover-to` variables, so they don't wash out in dark mode.

---

## 8.9.3 Background music — "listen while you read"

The **🎧 Listen while you read** button on a book's chapter pages (shown
when that book's `theme_track` column, §8.6, points to a **local-source**
track) now feeds into the same shared player described in §7.2 — tap it
and that track starts playing in the persistent "Now Playing" bar, which
keeps running as you move between chapters and tabs. Tap it again to
pause. This only works for **locally-hosted files** (`source = local`,
`assets/audio/...`) — if you want a book's "listen while you read" button
to work, make sure its `theme_track` points to a track row with
`source = local`. See §7.2 for the full playlist/queue/background-play
behavior, including what to expect from Audiomack/SoundCloud tracks.

---

## 9. Adding (or removing) a tab later

Every tab follows the same three-piece pattern — copy it when you add a new
media type:

1. **Data:** add a new tab to the workbook, and a `buildX()` function in
   `build-data.js` that reads it (copy `buildQuotes()` — it's the simplest).
2. **Render:** add a `renderX()` function in `js/app.js` (copy `renderQuotes()`),
   and a case for it in the `render()` router function near the top.
3. **Nav:** add one `<li><button data-tab="x">X</button></li>` line to the
   `<ul class="tabnav">` in `index.html`.

To *remove* a tab: delete its `<li>` from `index.html` and its `if (section
=== 'x')` line from `render()` in `app.js`. The data files can stay — they
just won't be linked from the nav.

---

## 10. Putting it online

You've used **Netlify Drop** before for the landing page — same process
works here:
1. Zip (or just drag) the whole `jtkiaz-app` folder onto
   [app.netlify.com/drop](https://app.netlify.com/drop).
2. You get a live URL immediately, free, no account required to start.

**GitHub Pages** is the other free option if you want a custom flow tied to
version history — push the folder to a repo, turn on Pages in settings.

### Can it run on Google Sites?
Short answer: **not directly, but you can point to it from one.** Google
Sites doesn't allow uploading raw HTML/JS/CSS or running the kind of
JavaScript this app needs — its "Embed" block only shows content that's
already hosted somewhere else (via URL or embed code), inside a sandboxed
frame. So the realistic setup is: host the real app on Netlify or GitHub
Pages (step above), then, if you still want a Google Sites presence, use
Google Sites' **Embed → By URL** block to frame your Netlify link into a
page there. The app itself needs to live on a real static host.

---

## 11. Other efficiency ideas

- **One weekly Excel session.** Since everything routes through the
  workbook, you can batch a week's worth of quotes/poems/blog posts into one
  sitting, save, rebuild once (§3), and redeploy once — rather than touching
  code per item.
- **Version your workbook.** Keep a dated copy of
  `JTKiaz-Content-Workbook.xlsx` before big edits (or use GitHub, which
  gives you that for free) — since `js/data.js` is fully auto-generated, the
  workbook is the one irreplaceable file here.
- **Analytics before payments.** Before building any paywall/backend, add a
  free analytics snippet (e.g. Plausible or GoatCounter — both lightweight
  and privacy-respecting) to `index.html` for a month first, so the paywall
  decisions (which book, which price) are based on real reading data instead
  of guesses.
- **Reuse across formats.** You already have this built into the structure:
  a poem can live as text (Poems tab), as audio (Music tab), and get quoted
  from (Quotes tab) — one piece of writing, three tabs, three reasons to
  come back.

---

## 13. The footer CTA — "Support this book/chapter/poem/song"

A second footer bar (below the plain-text one) now runs the full width of
the app: a soft gold sweep animation and a pulsing **💛 Support on
WhatsApp** button — visible but not shouting, "gleaming" rather than
flashing. It's static in `index.html` (`#footer-cta-text` /
`#footer-cta-btn`) but its wording and link change automatically per tab
and per item, driven from `js/app.js` → `updateFooterCta()`:

- On the **Books/Poems/Music/Blog list** pages it gives a general pitch for
  that tab ("Support a book — every read keeps new chapters coming.").
- On any **individual book, chapter, poem, or track**, it names the exact
  piece ("Enjoying *Ash and Amber*? Support it directly.") and the WhatsApp
  message it opens with is pre-filled to match — so whoever taps it, you
  immediately know what they were reading or listening to when they reached
  out.

To change the wording, edit the `pitches` object at the top of
`updateFooterCta()` in `js/app.js` — one `[html, message]` pair per tab.

---

## 14. Home & tab sponsor messaging

The old home screen led with a mood line ("Faith, story and sound in one
quiet room"). It still does — but the very first thing a reader now sees is
a direct call to action: **"Sponsor a Poem, Song, Book or Chapter"**, in a
small gold badge above the headline, followed by a **💛 Sponsor something
today** button.

- **Home:** edit the badge text, headline, and lede inside `renderHome()` in
  `js/app.js` (search for `hero-cta-eyebrow`). The sponsor button's WhatsApp
  message is the string passed to `waLink(...)` right next to it.
- **Every tab** (Books/Poems/Quotes/Music/Blog) also has its own themed
  sponsor button in its header — not a repeat of the home message, a
  different pitch per tab:
  - Books → *"💛 Sponsor a Book"*
  - Poems → *"💛 Sponsor a Poem"* (sits next to the existing "Surprise me" button)
  - Quotes → *"💛 Commission a Quote"*
  - Music → *"💛 Sponsor a Song"*
  - Blog → *"💛 Sponsor the Studio"*

  These live in one place — the `TAB_HEADER_CTA` object near the top of
  `js/app.js` — edit the `label` and `msg` for any tab there. Changing one
  entry changes only that tab's button; nothing else moves.

This layers on top of (not replacing) the footer CTA in §13 and the
engagement bar's WhatsApp comment link — between the three, a reader is
never more than one tap from reaching you, however they got there.

---

## 14.1 `admin-stats.html` — how private it actually is

Worth being precise about this, since "private" can mean different things:

- It's **not in the tab nav** and **not linked from anywhere** in the
  public app — a reader browsing normally will never stumble onto it.
- It is **not password-protected**, because nothing in this app has a
  login system to check a password against — there's no server, just
  static files. Anyone who is given (or guesses) the exact filename gets
  in, same as any other page on the site.
- The counts it shows come from **CountAPI**, which itself has no
  authentication — technically, anyone who knew both your namespace *and*
  the exact key for a specific item (e.g. `view:book:b001`) could query
  that one number directly, without this page at all. In practice that's
  not a realistic risk (it means guessing your exact internal IDs), but
  it's worth knowing it isn't cryptographically private, just obscure.

If that level of privacy is good enough (unlisted URL, casual reader can't
find it), you're done — just don't put a link to it anywhere public. If you
need real access control later (a login only you can pass), that requires
actual server hosting with authentication, which is a bigger step than
this static-site setup — worth asking about specifically if/when you want
it.

---

## 15. Playlist — the "sponsor cart"

A small **🎵** button now sits in the header, next to the hamburger menu.
Every book, chapter, poem, and track card has a **+ Playlist** button next
to it. Tapping one adds that item to a list stored on the reader's own
device (nothing is sent anywhere yet) — the header button shows a live
count.

Tapping the **🎵** button opens a slide-in panel listing everything they've
collected, each with a ✕ to remove it, and — if the list isn't empty — one
big button: **💛 Sponsor this playlist on WhatsApp**. That opens WhatsApp
with every item's type and title already typed out, so a reader who's been
browsing for ten minutes can turn all of it into a single message to you
instead of having to remember and retype what they liked.

This is the mechanic the brief calls "like a cart" — it's why the promo
pop-ups in §17 link back into the app rather than straight to WhatsApp:
the intended path is *pop-up → reader taps through → reads/listens →
adds to playlist → sponsors the whole playlist at once*.

**Nothing to configure** — it works automatically off whatever's in the
workbook. If you want to change the wording on the button or panel, look
for `openPlaylistPanel()` and `playlistAddBtnHTML()` in `js/app.js`.

---

## 16. Changing the footers

There are two separate footer bars, and they're edited in two different
places:

1. **The plain-text line** ("Hippy Vibes International Studio · JTKiaz App
   · Update content") — edit it directly in `index.html`, inside
   `<footer class="site-footer">`. It's plain text; change the words, keep
   the `<a href="update-content.html">` link so people can still reach the
   content tool. There's a comment right above it in `index.html` marking
   exactly where.
2. **The gold "Support" bar** underneath it — don't edit its text in
   `index.html` (what's there is only a placeholder shown for a split
   second before the app finishes loading). Its real wording is set by
   `js/app.js` per tab/item — see §13 for exactly where.

---

## 17. Promo Popups — timed pop-up ads

A brand-new feature: small, animated pop-up cards that appear on their own
while someone is browsing the app — after a set delay, with an image, a
short message, an optional sound, a button that takes them straight to the
book/poem/track/post being promoted, and (this part is non-negotiable, per
the brief) **a 💛 WhatsApp button on every single one.** They slide in from
the bottom-right corner (bottom of the screen on mobile), auto-dismiss after
14 seconds if ignored, and never stack — only one shows at a time, and none
ever appear while you're reading in fullscreen mode.

### Editing them — the "Promo Popups" tab
Every pop-up is one row on the **Promo Popups** tab of the workbook. Nothing
here needs a code change — add a row, rebuild (§3), and it's live.

| Column | What it does | Example |
|---|---|---|
| `popup_id` | unique ID, never shown to readers | `promo001` |
| `active` | `yes` / `no` — set to `no` to switch a pop-up off without deleting it | `yes` |
| `type` | just a label shown in small caps on the card — `book_promo`, `sponsor_cta`, `new_chapter`, or `general` | `book_promo` |
| `title` | the bold headline on the card | `Ash and Amber is waiting` |
| `message` | one or two sentences underneath | `A love story about rebuilding after loss — start Chapter 1 free.` |
| `image` | path under `assets/images/popups/` | `covers/ash-and-amber.jpg` (you can reuse a cover) |
| `sound` | optional path under `assets/audio/` — plays once when the card appears | `assets/audio/popup-chime.mp3` |
| `delay_seconds` | how long after the page loads before it can first appear | `25` |
| `repeat_every_seconds` | leave blank to show it once per visit; set a number to let it reappear that many seconds after being closed | `240` |
| `show_on` | which tab(s) it's allowed to appear on — `all`, or a comma list like `books,poems` | `books` |
| `link_type` | what the "take a look" button opens — `book`, `poem`, `track`, `blog`, or `none` | `book` |
| `link_id` | the matching `book_id`/`poem_id`/`track_id`/`post_id` | `book003` |
| `link_button_label` | text on that button | `Read Chapter 1` |
| `whatsapp_message` | the pre-filled WhatsApp text (leave blank and it auto-writes one from the title) | `Hi! I saw the pop-up for Ash and Amber...` |

**Before / after — a half-finished popup row vs. a complete one:**

*Before* (technically valid, but bare): `popup_id: promo005`, `active: yes`,
`title: New release`, `message: (blank)`, `image: (blank)`, `delay_seconds:
(blank)` → shows a plain text card with no picture, 30 seconds in (the
app's default), with a generic WhatsApp message.

*After* (same row, filled in): `title: New: The Bantu Book, Chapter 4`,
`message: The next chapter of the Bantu Book just dropped — read it free.`,
`image: covers/bantu-book.jpg`, `delay_seconds: 40`, `link_type: book`,
`link_id: book002`, `link_button_label: Read Chapter 4` → a fully branded
card with a cover image, a specific hook, and a direct path into the app.

### Adding your own sound
Drop an mp3 (a short "pop"/chime, 1–2 seconds is plenty — anything longer
gets talked over, not heard) into `assets/audio/`, and reference it from the
`sound` column. Browsers block audio from playing before the reader has
interacted with the page at all — in practice this is a non-issue, since by
the time any delay elapses they've already tapped a tab — but on the very
first popup of a session on some browsers the sound may be silently skipped.
That's expected and harmless; the pop-up still appears and works normally.

### Styling
The card's look (position, size, border, animation speed) is controlled by
the `.promo-popup` rules in `css/style.css` — search for "PROMO POPUPS" to
find that whole block, all in one place.

---

## 18. Uploading from Word documents without glitching

Chapters and blog posts are long enough that most people draft them in Word
first, then move them into the workbook. Two small habits prevent almost
every formatting glitch:

1. **Paste as plain text, not a normal paste.** In Excel, after copying from
   Word, use **Paste Special → Unformatted Text** (or the shortcut
   `Ctrl+Shift+V` / `⌘+Shift+V`) instead of `Ctrl+V`. A normal paste carries
   Word's smart/curly quotes (`" "` instead of `" "`), long em-dashes, and
   invisible formatting codes into the cell — these usually still *display*
   fine in Excel but can render as odd characters (`â€™` and similar) once
   the app reads them.
2. **Keep paragraph breaks as line breaks inside the one cell**, not as
   separate rows. A whole chapter's `content` belongs in a single cell — use
   `Alt+Enter` (Windows) or `Option+Return` (Mac) inside the cell to start a
   new paragraph without moving to a new row.
3. **Double-check for a trailing empty row** after a big paste — a blank row
   at the bottom of a sheet is harmless (the build script skips fully empty
   rows automatically), but a blank row *in the middle* of your chapters
   will break the chapter-number sorting for that book. Scan for gaps after
   any large paste.
4. **If you see broken characters after saving** (`â€™`, `Ã©`, boxes/question
   marks), it's almost always rule 1 — go back to the Word doc, copy again,
   and use Paste Special this time.

---

## 19. Favorites — a personal shortlist across every content type

A ❤ button now sits in the header (next to the sponsor "🎵 playlist" icon)
opening **Favorites** — separate from, and doesn't interfere with, either
the sponsor playlist above or the music queue in §7.2. It's simply
"things to come back to."

- **A heart toggle (♡ / ❤) on everything**: every book, every chapter,
  every poem, every quote, every track, and every blog post — on their
  card/row *and* on their own full page. Tap to save, tap again to
  remove.
- **One panel, everything in it.** The ❤ button opens a bottom sheet
  (a centered dialog on desktop) listing every favorited item, grouped
  by type — Books, Chapters, Poems, Quotes, Songs, Blog posts — most
  recently added first within each group. Tap any item to jump straight
  back to it; tapping a favorited song starts it playing immediately
  (since songs don't have their own page — they live in the player).
  A small ✕ next to each item removes it without leaving the panel.
- **Stored locally, only.** Like the queue and the view-mode toggles,
  Favorites lives in the browser's local storage on that device — nothing
  is sent anywhere, and it doesn't touch or read the sponsor playlist,
  the music queue, or each other.

---

## 20. Ideas for what's next

A few directions worth considering once the current feature set is bedding
in — none of these are built yet, just worth knowing they're realistic
next steps:

- **A "sponsor leaderboard" or credits page** — a public thank-you list
  pulled from a simple new tab (`sponsors.csv`/tab), so sponsoring feels
  like joining something visible, not a one-off transaction.
- **Email capture alongside WhatsApp** — some readers will always prefer
  email; a lightweight form (e.g. via a free Google Form embed) as a second
  option next to every WhatsApp button costs little and can only add reach.
- **A "continue where you left off" home tile** — the app already tracks
  chapter progress locally; surfacing "Pick up *Ash and Amber* at Chapter 3"
  right on the home screen would turn a one-time visitor into a returning
  reader with almost no new code.
- **Popup analytics via a free counter service** — the same free CountAPI
  approach already used for view/like counts (§8.10) could log how many
  times each promo pop-up's link button gets clicked, so you can see which
  pitch is actually working.
- **A downloadable "sponsor pack" PDF** — one-pager auto-generated per book,
  listing chapter status and a sponsorship price, attachable straight from
  the WhatsApp conversation once someone says yes.
- **Bulk chapter import from a single Word doc** — a small script that
  splits one manuscript file into chapter rows automatically by heading,
  removing the copy-paste step in §18 entirely for a full book at once.

None of these are required for the app to work — they're just where the
current groundwork (playlist, promo pop-ups, WhatsApp-first CTAs) naturally
points next.

---

## 21. What's already working, end to end

- Minimalist sticky header, mobile hamburger nav, keyboard-focus states,
  reduced-motion support, and a 🌙/☀️ light/dark mode toggle (§8.9.2).
- Home tab with live counts pulled straight from your data, plus a direct
  "Sponsor a Poem, Song, Book or Chapter" hero CTA (§14).
- Books: browsing, tags, ratings, per-book progress bar, chapter-by-chapter
  reader, automatic next-chapter unlock, locked-state UI for future
  chapters, a book-level like/share bar, and a quick "↗ Share" button on
  every book card.
- Poems: collection filters (Micro/Short/Long/Spoken Word), a working
  "Surprise me" random poem button, multi-part poem reader with a part
  switcher (pre-loaded with Swoon and Dodge), and ↑/↓ arrow-key browsing
  between poems with on-screen prev/next buttons (§5).
- Quotes: deterministic quote-of-the-day, tag chips, one-tap copy-to-share.
- Music: working `<audio>` playback for local files and iframe embedding for
  Audiomack/SoundCloud, a "🎧 Play in background" option for local tracks,
  and a clear on-screen prompt anywhere an embed link hasn't been added yet.
- Blog: a live embedded Facebook Page feed at the top (§8.11), plus the
  curated list + full post view, categorized, dated, sorted newest-first.
- A playlist ("sponsor cart") that collects books/chapters/poems/tracks and
  sends the whole list to WhatsApp in one message (§15).
- Timed, animated Promo Pop-ups with image, sound, an in-app link, and a
  WhatsApp button on every one — fully editable from one workbook tab (§17).
- Themed sponsor CTAs on the home screen and every tab header (§14), on top
  of the existing per-item footer CTA (§13).
- Your WhatsApp number (`263787726262`) is live everywhere in the app.
- The entire content layer regenerates from one Excel workbook with one
  upload or one command (§3).

Everything above is running against real sample data right now (3 books ×
10 chapters, 9 poems including your two spoken word pieces, 10 quotes, 3
music rows, 3 blog posts, 4 promo pop-ups) — open `index.html` and it's
already a complete, working app. Replace the sample rows with your real
material and rebuild.

Also already in place from earlier versions: per-book/per-poem accent
color, font, and ambient sound (§8.6); chapter hero images with an automatic
default and a fixed frame template (§8.7); tappable pop-ups inside chapter
text carrying an image, audio, video, and/or link (§8.8) — not to be
confused with the sitewide Promo Pop-ups in §17, which are a different
feature; a sticky reader toolbar with text size control and fullscreen, a
scroll progress bar, a controlled reading measure, lightweight paragraph
formatting (§8.9.1), and background-music support (§8.9.3); real view and
like tracking per chapter/poem/track/book/post — now private, visible only
to you on `admin-stats.html` (§8.10, §14.1) — plus share buttons and a
WhatsApp comment link everywhere.

---

## 22. Image size cheat-sheet

Every image slot in the app, with the exact dimensions to shoot or export
for a crisp result on phones, tablets, and desktop retina screens alike.
Nothing here is enforced — any size will display (images are cropped to
fit with `object-fit: cover`) — these are simply the sizes that will look
sharp and load quickly.

| Image | Where it's used | Recommended size | Aspect ratio | Format |
|---|---|---|---|---|
| **Book cover** | Book cards, book detail header, chapter fallback, home hero gallery | 1200 × 1600 px | 3∶4 (portrait) | JPG or WebP |
| **Chapter hero image** | Top of each chapter, via `image` in `the Chapters tab` | 1600 × 900 px | 16∶9 (landscape) | JPG or WebP |
| **Pop-up image** (§8.8) | Inline pop-up cards inside chapter text | 1200 × 800 px | 3∶2 | JPG or WebP |
| **Promo Popup image** (§17) | Timed pop-up ad cards — `image` column on the Promo Popups tab | 800 × 450 px | 16∶9 | JPG or WebP |
| **Poem collection cover** (§5) — new | The default image every poem card, poem list thumbnail, and poem detail hero uses for its collection. Save one per collection at `assets/images/poem-collections/micro.jpg`, `short.jpg`, `long.jpg`, `spoken-word.jpg`, plus `default.jpg` as a catch-all — paths are set in `POEM_COLLECTION_IMAGES` in `js/app.js` | 1000 × 1250 px | 4∶5 (portrait) | JPG or WebP |
| **Poem — individual override** (§5) — new, optional | Same slot as above, but for one specific poem only — fill in the `image` column on that poem's row in `the Poems tab` | 1000 × 1250 px | 4∶5 (portrait) | JPG or WebP |
| **Poem detail hero banner** — new | The wide banner shown at the top of an open poem's page — automatically reuses the same collection/poem cover image above (cropped wider), no separate upload needed | — (reuses the 4∶5 image, cropped to 3∶1) | 3∶1 (crops from above) | — |
| **Music tab hero banner** (§7) — new | Single wide image at the very top of the Music tab — path set as `MUSIC_HERO_IMAGE` in `js/app.js` (`assets/images/music/music-hero.jpg`); title/subtitle text also editable there | 1600 × 500 px | 16∶5 | JPG or WebP |
| **Track artwork** (§7.1) — new | Square cover art for each track — grid cards, list thumbnails, and the persistent player's mini bar / "Now Playing" panel. Optional `artwork` column on `the Music tab`; falls back to a shared image for the track's `type` (`MUSIC_TYPE_IMAGES` in `js/app.js`), then to `assets/images/music/track-default.jpg` | 800 × 800 px | 1∶1 (square) | JPG or WebP |
| **Blog header image** *(optional — not yet wired up; add an `image` column to `the Blog tab` and an `<img>` in `renderBlogDetail()` the same way chapters do)* | Top of a blog post | 1600 × 900 px | 16∶9 | JPG or WebP |
| **Home hero gallery figures** | Small immersive grid on the home screen (auto-filled from the first 4 books' covers) | Same as book cover (1200 × 1600) | 3∶4 or 4∶6 for the tall first tile | JPG or WebP |
| **Tab icons** | Next to each tab label in the header nav | Currently inline SVG (any size, vector) — if you'd rather use your own PNG icons, export at 64 × 64 px | 1∶1 | SVG (preferred) or PNG |
| **JTK logo mark** — new, wired up | Small branding mark now shown in the header (next to "JTKiazApp"), the footer, and as a faint watermark in the bottom-right corner of the home hero, every chapter reader, and every poem reader. One file, `assets/images/branding/jtk-logo.png`, used everywhere (`LOGO_IMAGE` in `js/app.js`) — until that file exists it just quietly doesn't show (no broken-image icon), so the app looks correct with or without it | 512 × 512 px master, transparent background | 1∶1 | PNG (transparent) or SVG |
| **Favicon** — new, wired up | Browser tab icon — `<link rel="icon">` now points at `assets/images/branding/favicon.png` in `index.html` | 512 × 512 px master (browsers generate smaller sizes) | 1∶1 | PNG or ICO |
| **Social share preview image** *(not currently set — add Open Graph meta tags to `index.html` if you want a preview image when your links are shared)* | WhatsApp/social link previews | 1200 × 630 px | 1.91∶1 | JPG or PNG |

**Quick folder map for the new image slots:**
```
assets/images/
├── branding/
│   ├── jtk-logo.png        ← 512×512, transparent — header/footer/watermarks
│   └── favicon.png         ← 512×512 — browser tab icon
├── poem-collections/
│   ├── micro.jpg           ← 1000×1250
│   ├── short.jpg           ← 1000×1250
│   ├── long.jpg            ← 1000×1250
│   ├── spoken-word.jpg     ← 1000×1250
│   └── default.jpg         ← 1000×1250, fallback for any other collection
└── music/
    ├── music-hero.jpg      ← 1600×500
    ├── track-default.jpg   ← 800×800, fallback for any track without its own artwork
    └── tracks/
        └── your-track.jpg  ← 800×800, one per track (optional, via the `artwork` column)
```
Every one of these is optional — the app degrades gracefully (the image
just doesn't render, nothing breaks) if a file isn't there yet. Add them
whenever you have the art ready.

General rules of thumb:
- Export at **2×** the display size if the photo is a hero/feature image
  people will look at closely (covers, chapter heroes) — screens are
  denser than they used to be.
- Keep individual files under **300 KB** where you can (WebP compresses
  much smaller than JPG at the same visual quality) — this is a
  no-build static app, so every extra megabyte is extra load time for
  the reader, especially on mobile data.
- Always fill in `image_caption`/`alt`-equivalent text where the app asks
  for it — screen readers and slow connections both rely on it.
