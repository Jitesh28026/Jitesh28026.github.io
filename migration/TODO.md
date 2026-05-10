# Migration TODO

This file is the catch-all for follow-ups, observations, and out-of-scope work the agent encountered during a stage. Stages **append** to this file; they do not act on it.

## Orphaned assets (populated in stage 0)

These 16 files in `assets/` are **not referenced** by `index.html` or `blog.html` and are scheduled for deletion in **Stage 9** (image pipeline) along with the rename of used images. Sizes are bytes from `ls -la`. Total orphan weight: **~6.9 MB**.

- `assets/batch-progress.png` (362 KB)
- `assets/batch-queue.png` (264 KB)
- `assets/data consolidation feel safe.png` (670 KB)
- `assets/Edit flow.png` (158 KB)
- `assets/Hero (3).png` (756 KB)
- `assets/Hero.png` (1.0 MB)
- `assets/Homescreen_ Export all.png` (264 KB)
- `assets/MacBook Air - 175.png` (115 KB)
- `assets/Main frame.png` (96 KB)
- `assets/offer rollout.png` (2.7 MB)
- `assets/PDP Final.png` (437 KB)
- `assets/Supplier Details _ attributes _ Company info (1).png` (96 KB)
- `assets/Supplier Details _ attributes _ Company info.png` (240 KB)
- `assets/Supplier Details edit.png` (96 KB)
- `assets/supplier-crm-1.png` (96 KB)
- `assets/supplier-crm-2.png` (96 KB)

For reference, the **12 used files** that we keep, optimize, and rename in Stage 9 are: `03. HomePage (View All Products).png`, `Artx (1).png`, `Dashboard.png`, `Final Landing page.png`, `Golden SKUs.png`, `jitesh-photo.jpg`, `MacBook Air - 19.png`, `Offer rollout (3).png`, `Products Table view.png`, `Screen config _ PDP.png`, `Supplier master (1).png`, `Upload entires.png`.

## External dependencies to evaluate (populated in stage 0)

External resources currently loaded by `index.html` and/or `blog.html`:

- **Google Fonts** — `fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Instrument+Serif:ital@1&family=Space+Grotesk:wght@400;500;700&display=swap`. **Recommendation: keep.** Self-hosting via `@fontsource` is an option but adds repo weight. The `&display=swap` strategy already prevents FOIT. Used in both `index.html` and `blog.html`.
- **AOS 2.3.1** — `unpkg.com/aos@2.3.1/dist/aos.css` + `unpkg.com/aos@2.3.1/dist/aos.js`. Provides scroll-reveal animations. **Recommendation: replace** in Stage 10 with a ~20-line `IntersectionObserver` script and CSS keyframes. Drops two CDN round trips and ~14 KB JS.
- **vanilla-tilt 1.8.0** — `cdnjs.cloudflare.com/ajax/libs/vanilla-tilt/1.8.0/vanilla-tilt.min.js`. Provides the 3D tilt effect on the hero card stack. **Recommendation: keep but lazy-load** in Stage 10 (only on `pointer: fine` after `requestIdleCallback`). Effect is design-relevant. Alternative: drop entirely if the user is okay losing it — needs design call in Stage 10.
- **three.js 0.136.0** — `cdn.jsdelivr.net/npm/three@0.136.0/build/three.module.js`. Drives the particle/sculpture canvas behind the hero (lines 3346-3500-ish in `index.html`). **Recommendation: design call needed in Stage 10.** Either drop entirely (drops ~600 KB JS) or self-host as a real npm dep with dynamic import + IntersectionObserver gate so it only loads when hero is visible and `prefers-reduced-motion: no-preference`. Modern three.js is tree-shakeable; minimum viable subset for this scene is probably 50–100 KB gzipped.

## Known issues to revisit (populated as they arise)

### Mixed path separators in `index.html` (HIGH — affects live site)

`index.html` uses **backslash paths** for some image references and **forward-slash paths** for others. Examples:
- Line ~2828: `<img src="assets\Supplier master (1).png" ...>` (backslash)
- Line ~2835: `<img src="assets\Offer rollout (3).png" ...>` (backslash)
- Line ~2843: `<img src="assets\Artx (1).png" ...>` (backslash)
- Line ~2997+: `<img src="assets/Golden SKUs.png" ...>` (forward-slash, OK)
- Line ~3030: `<img src="assets\MacBook Air - 19.png" ...>` (backslash)
- Line ~3060: `<img src="assets\Final Landing page.png" ...>` (backslash)
- `blog.html`: `<img src="assets\jitesh-photo.jpg" ...>` (backslash)

Backslash paths work when opening the file directly on Windows but **fail on web servers and Linux build environments**. This very likely means the corresponding images are currently broken on the live https://jitesh28026.github.io site. Stage 9 (image pipeline) fixes this implicitly when we move to `<Image>` imports.

### Massive image weights (MEDIUM)

Several images are far too large for a portfolio:
- `Products Table view.png` — 4.0 MB
- `offer rollout.png` (orphan) — 2.7 MB
- `MacBook Air - 19.png` — 2.5 MB
- `Screen config _ PDP.png` — 2.1 MB
- `03. HomePage (View All Products).png` — 1.5 MB

Stage 9 routes these through `astro:assets` which auto-generates AVIF/WebP at multiple sizes. Expect 90%+ size reduction for the modern-format variants.

### Asset filenames contain spaces and parentheses (LOW)

URLs survive these via percent-encoding, but they're ugly and error-prone. Stage 9 renames everything to lowercase kebab-case.

### Historical files at repo root (LOW)

`old_index.html` and `target_index.html` (4 MB combined) are committed to the repo and unreferenced. Stage 12 deletes them; their history remains in git.

### Body font mismatch in legacy CSS (LOW — user-decision)

The legacy `index.html` declared `font-family: 'Syne', sans-serif;` for `body` but the Google Fonts URL only loads DM Mono, Instrument Serif, and Space Grotesk. So the live site has been silently falling back to the visitor's system sans (e.g. Segoe UI on Windows, Helvetica/SF on macOS).

Stage 2 changed the body to `'Space Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif` to make rendering deterministic with the fonts that actually load. **Confirm with Jitesh:** is Space Grotesk for body the intended look, or did he want Syne loaded too? If Syne, add `&family=Syne:wght@400;500;700` to the Google Fonts URL in `BaseLayout.astro` and revert the body font in `global.css`.

## Deferred decisions

- **Stage 10:** keep or drop the three.js hero canvas? Visual: a particle field plus a rotating icosahedron sculpture behind the hero copy. If kept → ~50–100 KB extra JS, lazy-loaded. If dropped → page is faster but the hero loses its background motion.
- **Stage 10:** keep or drop vanilla-tilt on the hero card stack? Visual: the hero card subtly tilts toward the cursor on desktop hover. If kept → ~3 KB extra JS, lazy-loaded, only on `pointer: fine`. If dropped → the card stays static.
