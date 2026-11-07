// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// Set the final origin and optional subpath only when deploying.
const deploymentUrl = process.env.PUBLIC_SITE_URL
  ? new URL(process.env.PUBLIC_SITE_URL)
  : undefined;

export default defineConfig({
  site: deploymentUrl?.origin,
  base: deploymentUrl?.pathname || "/",
  vite: {
    plugins: [tailwindcss()],
  },
});
