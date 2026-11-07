# Repository guidance

## Purpose and stack

This repository contains Mohammed Siraj uddin’s personal portfolio. It uses Astro, Tailwind CSS v4 through `@tailwindcss/vite`, TypeScript, native HTML dialogs, and CSS 3D transforms. Keep the existing framework and lightweight client-side approach.

Use Node.js 24.12 or newer in the Node 24 LTS line. Tests import TypeScript directly through Node.

## Commands

```sh
npm ci             # Install the locked dependencies
npm run dev        # Start the Astro development server
npm run build      # Build the static site into dist/
npm run preview    # Preview an existing production build
npm run check      # Check Astro and TypeScript
npm test           # Rebuild the fixture and run happy-dom interaction tests
```

Run relevant checks after changes. The DOM tests cannot establish that layout, native dialog focus trapping, touch gestures, or visual overflow work in a browser. Report the actual verification performed and any browser-review limits.

## Active architecture

- `src/config.ts`: the single source for personal content, metadata text, contact details, learning topics, navigation labels, and typed future entries.
- `src/pages/index.astro`: the page document, metadata, header, carousel controls, compact section menu, and dialog composition.
- `src/components/SectionDialogs.astro`: server-rendered content for the six native dialogs.
- `src/components/Icon.astro`: lightweight SVG line icons.
- `src/scripts/portfolio.ts`: carousel selection, pointer/keyboard input, dialog lifecycle, focus restoration, and reduced-motion handling.
- `src/styles/global.css`: the black-and-violet palette, typography, glass surfaces, 3D layout, responsive mobile layout, focus states, and motion preferences.
- `public/favicon.svg`: the favicon.
- `scripts/generate-social-card.mjs`: original sharing artwork, with escaped name and wordmark read from `src/config.ts`; generates `public/social-card.svg` and `public/social-card.png` before each build.
- `tests/portfolio.test.mjs`: happy-dom tests for the built HTML and interaction script.
- `astro.config.mjs`: Astro/Tailwind configuration and production site/base-path settings derived from `PUBLIC_SITE_URL`.

Preserve a readable modern sans-serif aesthetic and the palette specified in the design. Keep personal content in the config rather than scattering it through components. Style changes belong in the stylesheet.

## Content contracts

The six section IDs are `introduction`, `about`, `achievements`, `projects`, `learning`, and `contact`. Each navigation entry maps to `section-{id}` and a corresponding native dialog. Keep navigation, dialog IDs, and interaction data attributes aligned.

Closed cards display only their title and matching icon. Biographies, descriptions, previews, and “Coming soon” belong only inside activated section dialogs.

`siteConfig.projects` and `siteConfig.achievements` use `PortfolioEntry[]` with these fields:

```ts
interface PortfolioEntry {
  title: string;
  description: string;
  url?: string;
  tags?: string[];
}
```

Empty arrays retain a “Coming soon” state within their dialogs. Do not fabricate experience, projects, achievements, certificates, statistics, testimonials, social accounts, or a portrait. There is no certificates section. Preserve the supplied personal prose and working contact destinations unless the user requests edits.

## Interaction contracts

Keep rotation visitor-controlled; do not introduce automatic spinning. Preserve pointer dragging, touch swiping, previous/next controls, keyboard arrows, and clickable position indicators. Distinguish dragging from activation. Vertical touch scrolling must remain native.

Dialogs need labelled close buttons, Escape support, focus management, focus restoration, and internally scrollable content. Pause carousel interaction while a dialog is open. Keep every section reachable through the compact section menu.

Honor `prefers-reduced-motion` with a simple static navigation grid and minimal motion. Keep mobile cards readable, controls comfortable to touch, and page width within the viewport. Use real HTML for all labels, controls, and section content.

## Build and deployment

The build regenerates the sharing image from the content config, then outputs the static site to `dist/`. Run `node scripts/generate-social-card.mjs` to regenerate the image independently; edit its artwork in the script rather than its generated files. Publishing is a separate action. Before a production build, set `PUBLIC_SITE_URL` to the final HTTPS URL, including a trailing slash and any deployment subpath. This configures the Astro origin/base and absolute canonical/social metadata. Preserve base-path-aware asset links.

## Licence

Keep `LICENSE.md` intact, including the original MIT licence and Ryan Fitzgerald’s copyright notice. Removing template-author content from the rendered portfolio does not remove licence obligations.
