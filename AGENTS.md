# Agents Brief — Jitesh28026.github.io

This repo is the personal portfolio of Jitesh Thakker, deployed at https://jitesh28026.github.io via GitHub Pages.

It is currently mid-migration from hand-written static HTML (`index.html`, `blog.html`) to Astro. **Any agent (Codex, Claude Code, or otherwise) working in this repo must:**

1. Read `migration/PLAN.md` first — it is the canonical, stage-by-stage migration plan.
2. Behave according to the constraints in `.claude/skills/portfolio-migration/SKILL.md`. The relevant rules are duplicated below for tools that don't read the skill file directly.
3. Append observations and out-of-scope follow-ups to `migration/TODO.md` rather than fixing them inline.

## Hard constraints

- **Free tier only.** GitHub Pages hosting. No paid services. No SSR. No edge runtime. No external runtime services.
- **Static output only.** Astro built with the default static adapter. `output` must remain `'static'` (the default).
- **Low bundle weight.** Default to zero client-side JS. Add `client:*` directives only when interaction genuinely requires it.
- **Preserve visual fidelity.** Port existing design tokens, fonts, animations, and layout faithfully before refactoring.
- **Incremental.** Every stage ends with a green `npm run build` and one clean commit.
- **No scope creep.** Do only the current stage. Defer the rest to `migration/TODO.md`.
- **TypeScript strict.** No `any`, no `// @ts-ignore`.

## Working principles

- Components live in `src/components/` (one section per file).
- CSS variables in `src/styles/tokens.css`, base styles in `src/styles/global.css`, component styles scoped inside each `.astro` file.
- Images rendered by Astro live in `src/assets/` (use `<Image>`); raw passthrough files live in `public/`.
- Lists are data-driven (typed TS arrays or Content Collections), never hardcoded inside component templates.
- Asset filenames are lowercase kebab-case, no spaces or parentheses.

## Deliverable rules per stage

After completing a stage, the agent must:
1. Verify the stage's acceptance criteria from `migration/PLAN.md`.
2. Run `npm run build` and confirm it exits 0.
3. Summarize files added/modified/removed and dependency changes.
4. Provide the exact commit message to use.
5. Stop. Do not move to the next stage. Do not run `git commit` or `git push` — those are user actions.

## What NOT to do

- Do not migrate content from `old_index.html` or `target_index.html` — they are historical and scheduled for deletion in the cleanup stage.
- Do not introduce Tailwind, MUI, framer-motion, GSAP, lodash, or any UI/animation framework unless `migration/PLAN.md` explicitly calls for it.
- Do not change the GitHub Pages deployment source on the user's behalf. The settings change is a manual user step in stage 11.
- Do not redesign. The migration preserves the current design 1:1.
