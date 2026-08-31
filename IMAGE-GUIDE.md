# JTKiaz App — Image Guide (clean list, all sizes)

Every image slot in the app in one place, with exact dimensions, where each
one goes, and where to put the file. Full detail (and the reasoning behind
each choice) is also in `README.md` §21 — this is the quick-reference copy.

Nothing here is *enforced*. Any image will display — it gets cropped to fit
with `object-fit: cover` — these are the sizes that will look sharp and load
fast on a phone, tablet, and retina desktop screen alike.

---

## 1. New in this update

| # | Image | Size | Ratio | Format | File goes at |
|---|---|---|---|---|---|
| 1 | **Poem collection cover** — one image represents an entire collection (Micro / Short / Long / Spoken Word) on every card, list thumbnail, and detail hero for poems in it | **1000 × 1250 px** | 4∶5 | JPG/WebP | `assets/images/poem-collections/micro.jpg`, `short.jpg`, `long.jpg`, `spoken-word.jpg` |
| 2 | **Poem collection fallback** — used for any collection name not covered above | 1000 × 1250 px | 4∶5 | JPG/WebP | `assets/images/poem-collections/default.jpg` |
| 3 | **Poem — individual override** *(optional)* — give one specific poem its own image instead of the shared collection cover | 1000 × 1250 px | 4∶5 | JPG/WebP | anywhere under `assets/images/…`; enter the path in that poem's `image` column in the workbook |
| 4 | **Music tab hero banner** — the single wide image at the top of the Music tab | **1600 × 500 px** | 16∶5 | JPG/WebP | `assets/images/music/music-hero.jpg` |
| 5 | **JTK logo mark** — shown in the header, the footer, and as a small watermark on the home hero and every reader page | **512 × 512 px**, transparent background | 1∶1 | PNG (transparent) or SVG | `assets/images/branding/jtk-logo.png` |
| 6 | **Favicon** — the little icon in the browser tab | 512 × 512 px | 1∶1 | PNG or ICO | `assets/images/branding/favicon.png` |
| 7 | **Track artwork** — square cover art per track, shown on Music grid cards, list thumbnails, and the persistent player (mini bar + "Now Playing" panel + queue) | **800 × 800 px** | 1∶1 (square) | JPG/WebP | anywhere under `assets/images/music/…`; enter the path in that track's `artwork` column in the workbook |
| 8 | **Track artwork fallback** — used for any track with no `artwork` filled in (and no per-type default set) | 800 × 800 px | 1∶1 | JPG/WebP | `assets/images/music/track-default.jpg` |

All eight are optional at launch — until the file exists, that image slot
simply doesn't render (no broken-image icon), so the app looks correct
either way. Add them whenever the art is ready.

---

## 2. Already in the app (unchanged)

| Image | Size | Ratio | Format | File goes at |
|---|---|---|---|---|
| Book cover | 1200 × 1600 px | 3∶4 | JPG/WebP | `assets/images/covers/…` |
| Chapter hero image | 1600 × 900 px | 16∶9 | JPG/WebP | `assets/images/chapters/…` |
| Inline pop-up image (inside chapter text) | 1200 × 800 px | 3∶2 | JPG/WebP | `assets/images/…` (path set in the `popups` column) |
| Promo Popup image (timed ad card) | 800 × 450 px | 16∶9 | JPG/WebP | `assets/images/popups/…` |
| Home hero gallery figures (auto-filled from first 4 book covers) | same as book cover | 3∶4 (4∶6 for the first, taller tile) | JPG/WebP | reuses `assets/images/covers/…` |
| Tab nav icons | vector, any size | 1∶1 | SVG (already inline) | n/a — edit `index.html` directly if changing |

## 3. Still optional / not wired up yet

| Image | Size | Ratio | Format | Notes |
|---|---|---|---|---|
| Blog post header image | 1600 × 900 px | 16∶9 | JPG/WebP | needs an `image` column added to the Blog tab + a matching `<img>` in `renderBlogDetail()` |
| Social share preview image | 1200 × 630 px | 1.91∶1 | JPG/PNG | needs Open Graph `<meta>` tags added to `index.html` |

---

## 4. General rules of thumb

- **Export at 2×** the on-screen size for anything a reader looks at
  closely (covers, poem collection art, chapter heroes, the music hero) —
  screens are denser than they used to be.
- **Keep files under ~300 KB** where you can. WebP compresses noticeably
  smaller than JPG at the same visual quality. This is a no-build static
  site, so every extra megabyte is extra load time, especially on mobile
  data.
- **Fill in alt text / captions** wherever the app asks for one (chapter
  `image_caption`, etc.) — screen readers and slow connections both lean
  on it.
- Every image above degrades gracefully if missing — a placeholder
  gradient (books, chapters, poems) or nothing at all (logo, favicon,
  music hero) shows instead of a broken-image icon.

---

## 5. Folder map — everything at a glance

```
assets/images/
├── covers/                    ← book covers (existing)
├── chapters/                  ← chapter hero images (existing)
├── popups/                    ← promo pop-up images (existing)
├── poem-collections/          ← NEW
│   ├── micro.jpg
│   ├── short.jpg
│   ├── long.jpg
│   ├── spoken-word.jpg
│   └── default.jpg
├── music/                     ← NEW
│   ├── music-hero.jpg
│   ├── track-default.jpg
│   └── tracks/
│       └── (one 800×800 image per track, optional)
└── branding/                  ← NEW
    ├── jtk-logo.png
    └── favicon.png
```
