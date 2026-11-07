import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { siteConfig } from "../src/config.ts";

// Personal text comes from the same config as the page. Escape XML before
// inserting it into the original artwork so content edits cannot break the SVG.
function escapeXml(value) {
  const entities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  };
  return String(value).replace(/[&<>"']/g, (character) => entities[character]);
}

const wordmark = siteConfig.wordmark.endsWith(".")
  ? `${escapeXml(siteConfig.wordmark.slice(0, -1))}<tspan fill="#D95D39">.</tspan>`
  : escapeXml(siteConfig.wordmark);
const name = escapeXml(siteConfig.name);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><linearGradient id="glass" x2="1" y2="1"><stop stop-color="#67615A"/><stop offset=".5" stop-color="#242424"/><stop offset="1" stop-color="#453127"/></linearGradient></defs>
<rect width="1200" height="630" fill="#F2EFE9"/>
<path d="M-60 260C170 90 310 440 590 300S980 40 1260 170V350C950 180 780 460 540 430S130 260-60 460Z" fill="#D95D39" fill-opacity=".14"/>
<path d="M1050-40C870 130 1120 230 820 370L1280 260V-40Z" fill="#D95D39" fill-opacity=".1"/>
<text x="60" y="70" fill="#171717" font-family="sans-serif" font-size="29" font-weight="700">${wordmark}</text>
<text x="600" y="210" text-anchor="middle" fill="#171717" font-family="sans-serif" font-size="100" font-weight="700" letter-spacing="-3">PORTFOLIO</text>
<ellipse cx="600" cy="440" rx="450" ry="95" fill="none" stroke="#D95D39" stroke-width="1"/>
<rect x="205" y="325" width="220" height="140" rx="18" fill="url(#glass)" stroke="#FAF7F0" stroke-opacity=".65" transform="rotate(8 315 395)"/>
<rect x="775" y="325" width="220" height="140" rx="18" fill="url(#glass)" stroke="#FAF7F0" stroke-opacity=".65" transform="rotate(-8 885 395)"/>
<rect x="445" y="325" width="310" height="185" rx="18" fill="url(#glass)" stroke="#D95D39" stroke-width="2"/>
<text x="600" y="585" text-anchor="middle" fill="#171717" font-family="sans-serif" font-size="23">${name}</text></svg>\n`;

await writeFile(new URL("../public/social-card.svg", import.meta.url), svg);
await sharp(Buffer.from(svg))
  .resize(1200, 630)
  .png()
  .toFile(fileURLToPath(new URL("../public/social-card.png", import.meta.url)));
