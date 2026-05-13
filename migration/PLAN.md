# Migration Plan — Static HTML → Astro on GitHub Pages

**Owner:** Jitesh Thakker
**Site:** https://jitesh28026.github.io
**Repo:** Jitesh28026.github.io (user-site, root-served)
**Source:** the live Firebase-hosted portfolio at `C:\Users\Jitesh\Desktop\Jitesh28026.github.io\` (one folder up from this repo). Files: `index.html` (3779 lines, two `<style>` blocks including a "polish pass" with prominent Three.js opacity), `about.html` (1837 lines), `edit-feature.html` (1418 lines), `supplier-master.html` (1314 lines), `404.html`, `assets/` (33 files). Inline CSS+JS, CDN-loaded AOS / vanilla-tilt / three.js. Note: the github.io repo originally had stale older versions — Stage 4.5 swapped them out for the live ones.
**Target:** Astro 4+ with TypeScript strict, content collections for case studies + blog, image optimization via `astro:assets`, deployed via GitHub Actions to GitHub Pages.

> Read this whole document before starting any stage. The agent working on a stage **only** does that stage; it does not read ahead and skip work.

---

## Stage status legend

- [ ] not started
- [~] in progress
- [x] done

```
[x] Stage 0  — Audit & branch
[x] Stage 1  — Scaffold Astro in place
[x] Stage 2  — CSS foundation (tokens, global, BaseLayout)
[x] Stage 3  — Navbar + Footer + Loader components
[x] Stage 4  — Hero section
[x] Stage 4.5— Source-of-truth swap (jitesht.com → public/legacy/)
[x] Stage 5  — Work section (data-driven)
[x] Stage 6  — Gallery + Process + Contact
[x] Stage 7  — About page port (replaces blog port)
[x] Stage 7.5— Edit Feature case study page port
[x] Stage 7.6— Supplier Master case study page port
[~] Stage 8  — Content collections (deferred — page-per-file approach chosen)
[x] Stage 9  — Image pipeline (homepage/About; case-study images deferred)
[ ] Stage 10 — JS cleanup (replace AOS, decide tilt/three)
[ ] Stage 11 — GitHub Actions deploy + Pages settings
[ ] Stage 12 — Cleanup + merge to main
[ ] Stage 13 — Hardening (sitemap, RSS, Lighthouse) — optional
```

Update this checklist at the end of each stage by editing this file.

---

## Stage 0 — Audit & branch

**Goal:** establish a clean baseline and a working branch.

**Tasks:**
- Confirm `git status` is clean. If not, stop and tell the user.
- Create branch `migration/astro` and check it out.
- Inventory which files in `assets/` are referenced by `index.html` and `blog.html`. Append the unreferenced (orphaned) files to `migration/TODO.md` for later deletion.
- Inventory all external resources loaded by the current site (Google Fonts, AOS, vanilla-tilt, three.js, any analytics) and list them in `migration/TODO.md` under "External dependencies to evaluate".
- Append a "Known issues to revisit" section to `migration/TODO.md` for anything weird the agent notices.

**Allowed dependency changes:** none.

**Acceptance:**
- On branch `migration/astro`.
- `migration/TODO.md` exists and contains: orphaned-asset list, external-dependency list, known-issues list.
- No source files modified.

**Commit message:** `chore(migration): audit baseline and prepare migration branch`

---

## Stage 1 — Scaffold Astro in place

**Goal:** initialize Astro alongside existing files without breaking the current site.

**Tasks:**
- Run `npm create astro@latest . -- --template minimal --typescript strict --install --no-git --skip-houston --yes` from the repo root (the agent should output this command for the user to run, **not** run it itself if `npm` is not allowed in the agent's environment; if the agent can run it, it should).
- The Astro init will add `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/`, `public/`, `node_modules/`, `.gitignore`, `README.md` (Astro's default). **Preserve the existing `README.md`** by not letting Astro overwrite it (rename Astro's to `README.astro.md` and discard it after copying anything useful).
- Edit `astro.config.mjs` to:
  ```js
  import { defineConfig } from 'astro/config';
  export default defineConfig({
    site: 'https://jitesh28026.github.io',
    // user-site repo: served from root, so no `base` is set
    compressHTML: true,
    build: { inlineStylesheets: 'auto' },
    devToolbar: { enabled: false },
  });
  ```
- Edit `tsconfig.json` to extend `astro/tsconfigs/strict`.
- Add to `.gitignore` (append, do not overwrite): `node_modules/`, `dist/`, `.astro/`, `.env`, `.env.*`, `!.env.example`.
- Replace `src/pages/index.astro` with a placeholder that renders just `<h1>Migration in progress — see /index.html</h1>` and a link to the live `index.html`. We'll build out the real homepage in later stages.
- Move the existing `index.html` and `blog.html` to `public/legacy/index.html` and `public/legacy/blog.html` so they remain accessible during migration at `/legacy/index.html` and `/legacy/blog.html` (sanity check: open in browser via `npm run dev`).
- Confirm `npm run dev` starts without errors and `npm run build` produces a `dist/` containing `index.html` and `legacy/index.html`.

**Allowed dependency changes:** Astro's default minimal install. No others.

**Acceptance:**
- `npm run build` exits 0.
- `dist/index.html` exists with the placeholder.
- `dist/legacy/index.html` and `dist/legacy/blog.html` exist and match the originals byte-for-byte.
- `node_modules/` is ignored by git.

**Commit message:** `feat(migration): scaffold Astro with TypeScript strict and preserve legacy HTML`

---

## Stage 2 — CSS foundation (tokens, global, BaseLayout)

**Goal:** lift the design system out of inline `<style>` blocks into reusable Astro primitives.

**Tasks:**
- Create `src/styles/tokens.css` containing **all** CSS custom properties from the `:root` block of `public/legacy/index.html` (colors, radii, shadows). Group them with comments matching the original sections.
- Create `src/styles/global.css` containing: the universal box-sizing reset, `html` / `body` base styles, font-family declarations, the `@font-face` or Google Fonts `<link>` references (extracted from `<head>`), reduced-motion media query if present, and any base-typography rules used site-wide.
- Create `src/layouts/BaseLayout.astro` that:
  - Accepts props `title: string`, `description?: string`, `ogImage?: string`.
  - Renders `<html lang="en">`, `<head>` with charset / viewport / title / description / Open Graph / Twitter card / canonical / favicon link / preconnect to fonts.googleapis.com and fonts.gstatic.com / Google Fonts stylesheet.
  - Imports `../styles/tokens.css` and `../styles/global.css`.
  - Renders a `<slot />` inside `<body>`.
- Update `src/pages/index.astro` to use `BaseLayout` with title `"Jitesh — Product Designer"` and the description from the original `<head>`. Body content stays the placeholder for now.
- Verify in the browser (`npm run dev`) that the placeholder page renders with the correct fonts and background color.

**Allowed dependency changes:** none.

**Acceptance:**
- `src/styles/tokens.css`, `src/styles/global.css`, `src/layouts/BaseLayout.astro` exist.
- `npm run build` exits 0.
- Built `dist/index.html` `<head>` contains charset, viewport, title, description, OG tags, font preconnect, font stylesheet, favicon link.
- Visual check: placeholder page uses the correct serif/sans font stack and color tokens (no FOUT/FOUC for >100ms).

**Commit message:** `feat(migration): extract design tokens, global styles, and BaseLayout`

---

## Stage 3 — Navbar + Footer + Loader components

**Goal:** port the smallest, most-reused UI primitives.

**Tasks:**
- Create `src/components/Navbar.astro`. Port markup, styles, and minimal JS for: hide-on-scroll-down / show-on-scroll-up, mobile toggle, anchor-link smooth scroll. Keep the exact class names, ARIA attributes, and IDs from the source. Scoped `<style>` block. The scroll-handling script goes in a `<script>` block (Astro inlines/bundles it automatically).
- Create `src/components/Footer.astro`. Port markup and styles for the footer (logo, copy text, links). Pure markup + CSS, no JS.
- Create `src/components/Loader.astro`. Port the pre-loader with the `sessionStorage` skip-on-revisit logic from commit `f3ac6c8`. The skip logic must run **before** the loader paints to avoid a flash — use an inline `is:inline` script in `<head>` via a layout slot or a small synchronous script in the component.
- Update `BaseLayout.astro` to render `<Loader />` first, then a `<slot />`, then `<Footer />`. **Do not** include `<Navbar />` in the layout — pages will mount it themselves so non-portfolio pages (404, etc.) can opt out.
- Update `src/pages/index.astro` to import and render `<Navbar />` above its placeholder content.
- Verify in the browser: navbar appears, hides on scroll down, shows on scroll up; footer appears at the bottom; loader appears on first visit and is skipped on subsequent visits in the same tab.

**Allowed dependency changes:** none.

**Acceptance:**
- All three components exist and are imported correctly.
- `npm run build` exits 0.
- Built page contains the navbar, footer, and loader markup.
- Manual browser test passes for the three behaviors above.

**Commit message:** `feat(migration): port Navbar, Footer, and Loader as Astro components`

---

## Stage 4 — Hero section

**Goal:** port the hero section (markup, styles, copy). Defer the Three.js canvas.

**Tasks:**
- Create `src/components/Hero.astro`. Port the entire `<section class="hero" id="home">` block from `public/legacy/index.html`, including the badge, title, description, CTAs, and hero card stack.
- For the `<canvas id="global-three-canvas">`: keep the canvas element in markup but **do not** import three.js yet. Add a TODO comment in the file referencing stage 10. The canvas will be invisible until the script is wired up — that's expected.
- Port hero-specific styles into the component's scoped `<style>` block. Strip any CSS that's already in `tokens.css` or `global.css`.
- Replace the hero CTA `href="#work"` and `href="#contact"` with the same anchors (those sections will be added in later stages — broken anchors during migration are acceptable; they'll resolve as sections come online).
- The hero `<img>` for the user photo: leave it as `<img src="/legacy/.../jitesh-photo.jpg">` for now. Stage 9 swaps it to `<Image>`.
- Update `src/pages/index.astro` to render `<Hero />` after `<Navbar />`.

**Allowed dependency changes:** none.

**Acceptance:**
- `src/components/Hero.astro` exists with full markup and scoped styles.
- `npm run build` exits 0.
- Visual check: hero matches the live site (text, layout, CTA buttons). The Three.js canvas is empty/invisible — that's expected.

**Commit message:** `feat(migration): port Hero section component`

---

## Stage 5 — Work section (data-driven)

**Goal:** port the work grid with the case-study cards as data, not hardcoded markup.

**Tasks:**
- Create `src/data/work.ts` exporting a typed array `WorkCard[]` where each item has: `id`, `title`, `summary`, `tags: string[]`, `thumbnail` (string path under `/legacy/...` for now), `href` (external URL), `external: boolean`. Populate it with the existing 4 cards from `public/legacy/index.html`: Supplier Master (Figma deck), Offer Rollout (Medium), ART-X (Behance), and the placeholder fourth card.
- Create `src/components/Work.astro`. It imports `work.ts`, maps over the array, and renders `<a class="project-card">` (or `<div>` for non-link cards) with the same markup as the source. Card-level styles are scoped inside the component.
- The "All case studies" CTA button: keep as a static element inside `Work.astro` for now. Stage 8 may convert it to a link to a `/work` index page once the content collection exists.
- Update `src/pages/index.astro` to render `<Work />` after `<Hero />`.

**Allowed dependency changes:** none.

**Acceptance:**
- `src/data/work.ts` exists and is fully typed; `tsc --noEmit` (or `astro check`) passes.
- All 4 cards render correctly with their thumbnails, titles, summaries, tags, and external links.
- `npm run build` exits 0.

**Commit message:** `feat(migration): port Work section with data-driven case-study cards`

---

## Stage 6 — Gallery + Process + Contact

**Goal:** port the remaining homepage sections.

**Tasks:**
- Create `src/components/Gallery.astro`. Port the gallery markup including the masonry/carousel structure. If the source uses a JS-driven layout, replace it with CSS `column-count` or CSS Grid masonry where possible to drop JS. If a small JS controller is unavoidable, isolate it in a single `<script>` block.
- Create `src/components/Process.astro`. Port the process section markup and styles.
- Create `src/components/Contact.astro`. Port the contact section: email button, LinkedIn, Behance, resume buttons. Keep the `mailto:` and external `https:` URLs identical.
- Update `src/pages/index.astro` to compose: `Navbar → Hero → Work → Gallery → Process → Contact → (Footer is in BaseLayout)`.

**Allowed dependency changes:** none.

**Acceptance:**
- All three components exist and render.
- `npm run build` exits 0.
- Homepage now has every section the legacy site has, except for Three.js animation in the hero canvas (stage 10) and image optimization (stage 9).

**Commit message:** `feat(migration): port Gallery, Process, and Contact sections`

---

## Stage 7 — Blog page port

**Goal:** convert `blog.html` into an Astro page that lives at `/blog`.

**Tasks:**
- Create `src/pages/blog/index.astro` using `BaseLayout`. Port the markup of `public/legacy/blog.html` minus its `<head>` (which is now handled by `BaseLayout`).
- Extract any blog-specific styles into the page's scoped `<style>` block. Hoist any tokens or globally-applicable rules into `tokens.css` / `global.css` as appropriate.
- If `blog.html` lists individual blog posts, treat each as a placeholder for now — stage 8 wires them to a content collection.
- Update navbar links to use `/blog` instead of `/blog.html`.

**Allowed dependency changes:** none.

**Acceptance:**
- `/blog` renders correctly via `npm run dev`.
- `npm run build` produces `dist/blog/index.html`.
- Navbar links to `/blog` work from every page.

**Commit message:** `feat(migration): port blog page to /blog route`

---

## Stage 8 — Content collections (work, blog) + dynamic routes

**Goal:** make case studies and blog posts addable as MDX files, no code changes required.

**Tasks:**
- Install: `npm i -D @astrojs/mdx` and add the integration in `astro.config.mjs`.
- Create `src/content/config.ts` defining two collections:
  - `work` with schema: `title (string)`, `summary (string)`, `publishedAt (date)`, `tags (string[])`, `thumbnail (image)`, `externalUrl (string, optional)`, `draft (boolean, default false)`.
  - `blog` with schema: `title (string)`, `description (string)`, `publishedAt (date)`, `tags (string[])`, `cover (image, optional)`, `draft (boolean, default false)`.
- Create one example MDX file in each collection (`src/content/work/_example.mdx`, `src/content/blog/_example.mdx`) — prefix `_` so they're ignored by Astro's collection resolver but remain as templates.
- Create `src/pages/work/[...slug].astro` that renders an individual case study from the collection. Layout: title, hero image, summary, content body, related links.
- Create `src/pages/blog/[...slug].astro` for blog posts. Same shape.
- Update the homepage `Work` component to merge data: external case-study cards from `src/data/work.ts` (existing ones link out to Figma/Medium/Behance) **plus** any non-draft entries from the `work` collection that have `externalUrl` undefined. The merged list is sorted by `publishedAt` desc.
- Update `src/pages/blog/index.astro` to list all non-draft entries from the `blog` collection sorted by `publishedAt` desc.

**Allowed dependency changes:** `@astrojs/mdx` (dev dep).

**Acceptance:**
- `npm run build` exits 0 with zero collection entries (the `_example.mdx` files are ignored).
- `astro check` passes with no schema errors.
- The blog listing page renders an empty state ("No posts yet") gracefully.
- Adding a new MDX file to `src/content/work/` (without `_` prefix) appears on the homepage without any code change. **Test this manually with a throwaway file, then delete the file.**

**Commit message:** `feat(migration): add work and blog content collections with dynamic routes`

---

## Stage 9 — Image pipeline (rename, move, optimize)

**Goal:** route used images through Astro's optimization pipeline. Rename to clean kebab-case.

**Tasks:**
- Source location for all images is `public/legacy/assets/` (relocated in Stage 1 so the legacy preview at `/legacy/index.html` resolves correctly during migration).
- Identify which files in `public/legacy/assets/` are referenced by any `.astro` component or content collection (use the orphaned-asset list from stage 0 as the inverse).
- For each used image:
  - Move to `src/assets/work/` or `src/assets/<section>/` based on usage.
  - Rename to lowercase kebab-case, no spaces, no parentheses (e.g., `Supplier master (1).png` → `supplier-master.png`). Keep file extension.
- Replace `<img src="...">` references in components and `src/data/work.ts` with imports plus the `<Image>` component from `astro:assets` (or `getImage()` for cases where you need raw URLs):
  ```astro
  ---
  import { Image } from 'astro:assets';
  import supplierMaster from '../assets/work/supplier-master.png';
  ---
  <Image src={supplierMaster} alt="Supplier Master case study" widths={[400, 800, 1200]} sizes="(max-width: 768px) 100vw, 600px" />
  ```
- For images that must remain in `public/` (favicon, OG image): rename them too and update references.
- Delete orphaned files from `public/legacy/assets/` per the stage-0 list. The folder itself is removed during Stage 12 cleanup along with the rest of `public/legacy/`.

**Allowed dependency changes:** none beyond what's already installed (Astro ships `astro:assets` built in).

**Acceptance:**
- No `<img>` tags pointing to `/legacy/` or `/assets/` remain in `src/`.
- `npm run build` exits 0 and `dist/` contains optimized variants under `_astro/`.
- Visual check: images render with same aspect ratios and crispness; Network tab shows AVIF/WebP served to modern browsers.
- `public/legacy/assets/` contains only files documented as deferred in `migration/TODO.md` (or is empty if all are migrated).

**Commit message:** `feat(migration): route images through astro:assets and rename to kebab-case`

---

## Stage 10 — JS cleanup (replace AOS, decide tilt/three)

**Goal:** drop CDN libraries. Ship the smallest amount of JS possible.

**Tasks:**
- **Replace AOS:** create `src/scripts/reveal.ts` implementing reveal-on-scroll with `IntersectionObserver`. Add a single CSS class `.reveal` with default hidden state and a `.reveal--visible` class with the animation. Update components that use `data-aos="..."` to use `class="reveal"` and a `data-reveal-direction="up|down|left|right"` attribute. Remove the AOS `<link>` and `<script>` from `BaseLayout`.
- **Vanilla-tilt:** if the hero card uses tilt, evaluate whether the effect is essential. If yes: load it lazily — only initialize on `pointer: fine` devices, only after first interaction or after `requestIdleCallback`. If no: remove it entirely and clean the `data-tilt*` attributes.
- **Three.js hero canvas:** decision tree:
  - If the canvas was decorative and the page works visually without it → delete the `<canvas>` element and any related code.
  - If it's essential → import three.js as a dynamic ES module inside a `<script>` block guarded by `if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches)` and `IntersectionObserver` so it only loads when the hero is in view. Use a tree-shakeable import (`three/examples/jsm/...`) and tree-shake aggressively.
  - The user's call: ask the user which to choose if it's not obvious from the existing code (the canvas is currently part of the hero per `index.html` line 2800).
- **Loader:** verify the sessionStorage skip logic is intact. Move it to `src/scripts/loader.ts` if it's currently inline.

**Allowed dependency changes:**
- Add `three` only if the canvas is kept (with confirmation from the user).
- Remove: nothing yet from `package.json` since AOS/tilt/three were CDN-only — just remove the CDN tags.

**Acceptance:**
- No `https://unpkg.com/...` or `https://cdn.jsdelivr.net/...` script/link tags remain.
- Reveal-on-scroll animations still play.
- `npm run build` exits 0.
- Lighthouse Performance score ≥ 90 on the homepage (run from devtools or `npx lighthouse http://localhost:4321` after `npm run preview`).
- Total JS shipped to the homepage is < 50 KB gzipped (check the Network tab; flag in `migration/TODO.md` if exceeded).

**Commit message:** `refactor(migration): drop AOS/tilt/three CDN deps, ship native equivalents`

---

## Stage 11 — GitHub Actions deploy + Pages settings

**Goal:** automated build-and-deploy on every push to `main`.

**Tasks:**
- Create `.github/workflows/deploy.yml` based on the official Astro + GitHub Pages template:
  ```yaml
  name: Deploy to GitHub Pages
  on:
    push:
      branches: [main]
    workflow_dispatch:
  permissions:
    contents: read
    pages: write
    id-token: write
  concurrency:
    group: pages
    cancel-in-progress: false
  jobs:
    build:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: 20
            cache: npm
        - run: npm ci
        - run: npm run build
        - uses: actions/configure-pages@v4
        - uses: actions/upload-pages-artifact@v3
          with:
            path: ./dist
    deploy:
      needs: build
      runs-on: ubuntu-latest
      environment:
        name: github-pages
        url: ${{ steps.deployment.outputs.page_url }}
      steps:
        - id: deployment
          uses: actions/deploy-pages@v4
  ```
- Add a `package-lock.json` if not already present (run `npm install` once and commit it).
- **Manual user step (the agent must surface this clearly, not perform it):** on github.com, navigate to repo Settings → Pages → Build and deployment → Source: switch from "Deploy from a branch" to "GitHub Actions". This must happen **before** the next push to main, or the deploy job will not have permission to publish.

**Allowed dependency changes:** none.

**Acceptance:**
- Workflow file exists and is syntactically valid (run `npx --yes action-validator .github/workflows/deploy.yml` if available, or just inspect).
- `package-lock.json` is committed.
- Stage output instructs the user to flip the Pages source to "GitHub Actions" before merging.

**Commit message:** `ci(migration): deploy Astro build to GitHub Pages via Actions`

---

## Stage 12 — Cleanup + merge to main

**Goal:** remove legacy files, finalize, merge.

**Tasks:**
- Delete `public/legacy/index.html`, `public/legacy/blog.html`, and the `public/legacy/` directory.
- Delete `old_index.html` and `target_index.html` from the repo root.
- Rewrite `README.md` to describe the new stack (Astro + TS), local dev (`npm install`, `npm run dev`), build (`npm run build`), deploy (push to `main` triggers Actions), content authoring (drop MDX into `src/content/...`), and link to `migration/PLAN.md` for history.
- Update `.gitignore` if anything new needs to be ignored.
- Run `npm run build` one last time. Inspect `dist/` to confirm there are no references to `/legacy/` or any deleted asset.
- Update the checklist at the top of this `migration/PLAN.md` so all completed stages are `[x]`.
- The user merges `migration/astro` to `main` via PR (with squash or merge commit, user's choice). Once merged and Actions deploys, verify the live site at https://jitesh28026.github.io renders correctly and there are no console errors.

**Allowed dependency changes:** none.

**Acceptance:**
- `git status` clean.
- `npm run build` exits 0 and `grep -r "legacy" dist/` returns nothing.
- Live site loads and renders without errors after deploy.

**Commit message:** `chore(migration): remove legacy HTML files and update README`

---

## Stage 13 — Hardening (optional)

**Goal:** SEO and quality polish. Run only if stages 0–12 are stable.

**Tasks:**
- Install `@astrojs/sitemap` and `@astrojs/rss`. Configure sitemap in `astro.config.mjs`. Add an RSS endpoint at `src/pages/rss.xml.ts` that lists blog collection entries.
- Add a `robots.txt` in `public/` allowing all bots and pointing at the sitemap.
- Add a 404 page at `src/pages/404.astro`.
- Add Open Graph image generation: a static `public/og-image.png` (1200×630) referenced from `BaseLayout`'s default `ogImage` prop.
- (Optional) Add a Playwright smoke test that loads `/` and `/blog` and asserts the navbar and footer are present.
- (Optional) Add a Lighthouse-CI workflow that runs on PRs and posts the report.

**Allowed dependency changes:** `@astrojs/sitemap`, `@astrojs/rss`, optionally `@playwright/test`.

**Acceptance:**
- `dist/sitemap-index.xml` and `dist/rss.xml` exist.
- 404 page renders correctly.
- All previous acceptance criteria still hold.

**Commit message:** `feat(migration): add sitemap, RSS, 404 page, OG image`

---

## Reference: file layout at the end of stage 12

```
.
├── .claude/skills/portfolio-migration/SKILL.md
├── .github/workflows/deploy.yml
├── .gitignore
├── AGENTS.md
├── README.md
├── astro.config.mjs
├── migration/
│   ├── PLAN.md      ← this file
│   └── TODO.md
├── package.json
├── package-lock.json
├── public/
│   ├── favicon.svg
│   └── robots.txt
├── src/
│   ├── assets/
│   │   ├── work/...
│   │   └── ...
│   ├── components/
│   │   ├── Contact.astro
│   │   ├── Footer.astro
│   │   ├── Gallery.astro
│   │   ├── Hero.astro
│   │   ├── Loader.astro
│   │   ├── Navbar.astro
│   │   ├── Process.astro
│   │   └── Work.astro
│   ├── content/
│   │   ├── config.ts
│   │   ├── blog/_example.mdx
│   │   └── work/_example.mdx
│   ├── data/
│   │   └── work.ts
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── 404.astro          (stage 13)
│   │   ├── index.astro
│   │   ├── blog/
│   │   │   ├── [...slug].astro
│   │   │   └── index.astro
│   │   └── work/
│   │       └── [...slug].astro
│   ├── scripts/
│   │   ├── loader.ts
│   │   └── reveal.ts
│   └── styles/
│       ├── global.css
│       └── tokens.css
└── tsconfig.json
```
