# Siraj’s portfolio

A personal portfolio for Mohammed Siraj uddin, built with Astro, Tailwind CSS v4, TypeScript, and lightweight CSS 3D transforms and opaque charcoal panels. Six title-and-icon cards open the introduction, about, achievements, projects, learning, and contact sections in native glass dialogs.

The desktop carousel rotates only when a visitor interacts with it. Mobile uses a simpler swipeable layout. Visitors who prefer reduced motion get a static section grid. A compact section menu provides another route to every dialog.

## Run locally

Use Node.js **24.12 or newer in the Node 24 LTS line** and npm. The interaction tests import TypeScript directly through Node.

```sh
npm ci
npm run dev
```

Open the local URL printed by Astro. Other commands:

| Command           | Purpose                                                             |
| ----------------- | ------------------------------------------------------------------- |
| `npm run build`   | Generate the static production site in `dist/`.                     |
| `npm run preview` | Serve the production build locally after building.                  |
| `npm run check`   | Check Astro and TypeScript diagnostics.                             |
| `npm test`        | Rebuild the HTML fixture, then run the happy-dom interaction tests. |

## Edit content

All personal text, contact details, page title and description, learning topics, and future entries live in **`src/config.ts`**. The exported `sections` list defines the six navigation labels, IDs, and icons. Keep those IDs in sync with the corresponding dialog content if changing the section structure.

`projects` and `achievements` start as empty arrays. Their dialogs display “Coming soon” until an entry is added; that text never appears on a closed card.

Both arrays accept the same entry shape:

```ts
{
  title: string;
  description: string;
  url?: string;
  tags?: string[];
}
```

To add an entry, replace an empty array with verified content. For example, edit this placeholder before using it:

```ts
projects: [
  {
    title: "Replace with a project title",
    description: "Replace with an accurate description of the project.",
    // url: add a working project URL if available,
    // tags: add relevant topics if useful,
  },
] as PortfolioEntry[],
```

Use the same structure for `achievements`. Omit `url` and `tags` when unnecessary. Avoid adding unverified experience or qualifications.

The palette, glass surfaces, layout, responsive rules, and motion settings are in **`src/styles/global.css`**. Original line icons are in **`src/components/Icon.astro`**. The favicon is **`public/favicon.svg`**. The sharing artwork is defined in **`scripts/generate-social-card.mjs`**, which reads the name and wordmark from the same config and generates **`public/social-card.svg`** and **`public/social-card.png`**. Content edits appear in the sharing image on the next `npm run build`; run `node scripts/generate-social-card.mjs` to regenerate it independently.

## Controls and accessibility

- Scroll over the ring to rotate (down advances, up goes back). Small trackpad movements accumulate; one continuous gesture advances at most one card, rearming after 220 ms without wheel input. Browser zoom, reduced-motion page scrolling, and open dialogs keep their normal scroll behavior.
- Drag horizontally or swipe to rotate; vertical touch gestures remain available for page scrolling.
- Use the previous/next buttons or position indicators to select a card.
- Use Left/Right arrows while focused within the carousel. Home/End select its first/last card.
- Click a card, or activate it with Enter/Space, to open its section. Dragging does not open a dialog.
- Use the labelled close button or Escape to close. Focus returns to the originating card, or to the compact menu’s summary when opened through that menu.
- Native modal dialogs keep background content inactive while open. Long content scrolls inside the dialog.
- Reduced-motion preferences remove unnecessary transitions and replace the ring with a simple grid.

## Verify changes

```sh
npm run check
npm test
```

The happy-dom tests exercise DOM interactions and content contracts. They do **not** verify browser rendering, native modal focus trapping, real touch input, or visual overflow.

Before publishing, review the site in a browser at desktop and mobile widths:

- Check the 3D ring, readable card labels, mobile layout, and absence of horizontal page overflow.
- Try dragging versus clicking, touch swiping, previous/next buttons, indicators, and keyboard arrows.
- Open every section with both pointer and keyboard input. Check focus trapping, close-button and Escape behavior, focus restoration, and scrolling within a long dialog.
- Enable reduced motion and confirm that all sections remain reachable in the static grid and compact menu.
- Check the email and Instagram destinations, visible keyboard focus, and text readability.

## Deploy

Publishing is a separate step; the implementation does not deploy automatically. Astro builds a static site that can be hosted by any service that serves `dist/`.

Before a production build, set **`PUBLIC_SITE_URL`** to the final HTTPS site URL, including a trailing slash and any deployment subpath:

```sh
PUBLIC_SITE_URL=https://example.com/portfolio/ npm run build
```

Replace that example with the actual destination. The Astro configuration uses this value for its site origin and base path; page metadata uses it for canonical and absolute social-image URLs. For a site at the domain root, use a URL such as `https://example.com/`. Keep local development unset unless testing a base path.

Configure the hosting service’s install command as `npm ci`, build command as `npm run build`, output directory as `dist`, and Node version as 24.12 or newer in the 24 LTS line. Supply `PUBLIC_SITE_URL` in that service’s build environment. For repository subpath hosting, ensure the configured URL includes that subpath. Rebuild after changing the deployment URL or content.

## Licence

This project retains the original MIT licence and Ryan Fitzgerald’s copyright notice in **`LICENSE.md`**. Preserve that notice when redistributing the source or substantial portions of it.
