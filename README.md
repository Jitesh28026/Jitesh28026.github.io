# Jitesh28026.github.io

Personal portfolio for [Jitesh Thakker](https://jitesht.com), product designer based in Bengaluru. Deployed at https://jitesh28026.github.io via GitHub Pages.

## Stack

- **Astro 6** with TypeScript strict — static-site generation, zero client-side JS by default
- **Hosted on GitHub Pages**, deployed via GitHub Actions on push to `main`
- **Image pipeline**: `astro:assets` generates responsive AVIF/WebP at 400 / 800 / 1200 widths
- **Lazy-loaded interactive layers**: Three.js hero sphere + vanilla-tilt hero card, both gated on `prefers-reduced-motion` and viewport intersection

## Local development

```bash
npm install
npm run dev      # http://localhost:4321
```

## Build + preview

```bash
npm run build    # outputs to dist/
npm run preview  # serves dist/ at http://localhost:4321
npm run check    # astro check (TypeScript + Astro diagnostics)
```

## Routes

| Route | Source |
|---|---|
| `/` | `src/pages/index.astro` (composes Navbar, Hero, Marquee, Work, Gallery, Process, Contact) |
| `/about` | `src/pages/about.astro` (includes Aim Lab game) |
| `/work/edit-feature` | `src/pages/work/edit-feature.astro` |
| `/work/supplier-master` | `src/pages/work/supplier-master.astro` |

## Adding a case study

Two paths today:

1. **Add as an external link**: edit `src/data/work.ts`, set `external: true` and `href: 'https://…'`.
2. **Add as a full Astro page**:
   - Drop the HTML body into `src/_case-studies/<slug>-body.html`
   - Create `src/pages/work/<slug>.astro` using `CaseStudyLayout`
   - Add an entry in `src/data/work.ts` with `href: '/work/<slug>'`

If you start authoring more case studies, consider migrating to Astro Content Collections (see `migration/TODO.md`).

## Deploy

Push to `main`. The workflow at `.github/workflows/deploy.yml` builds and publishes to GitHub Pages.

**One-time setup** (already done if Pages is configured): Settings → Pages → Build and deployment → **Source: GitHub Actions**.

## History

This repo went through an Astro migration from a single 3,500-line `index.html`. See `migration/PLAN.md` for the full stage-by-stage record and `migration/TODO.md` for deferred follow-ups.
