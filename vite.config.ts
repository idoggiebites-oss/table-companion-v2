import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync, existsSync } from "node:fs";

/*
 * The compendium build this app is compiled against, baked in.
 *
 * It is published separately, so the two halves can drift — an app that
 * reads a field its compendium does not have yet shows blanks and fails
 * nothing. Asking for a version in the path means this build can only ever
 * see the compendium it was built with. "dev" is the fallback so a checkout
 * that has not compiled one yet still builds.
 */
const contentVersion = existsSync("content-dist/version.json")
  ? (JSON.parse(readFileSync("content-dist/version.json", "utf8")) as { version: string }).version
  : "dev";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "Table Companion",
        short_name: "Companion",
        description: "A companion for a table that is already in the room together.",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#FAF7F2",
        theme_color: "#FAF7F2",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        /*
         * The shell and the art are precached; the compendium is not.
         *
         * A player's chunks are 40KB and worth having offline, but the spell
         * and item indexes are 1.4MB and only a caster in a fight reads them.
         * Precaching everything would make the first visit pay for the whole
         * compendium on a phone in a basement.
         */
        globPatterns: ["**/*.{js,css,html,woff2}", "art/**/*.jpg", "icon-*.png"],
        /* The push handlers. Workbox writes the precache and the routing and
           has no opinion about notifications; this adds the two listeners it
           does not generate, without taking over the whole service worker. */
        importScripts: ["/push-sw.js"],
        maximumFileSizeToCacheInBytes: 3_000_000,
        runtimeCaching: [
          {
            /* Prose, one file per record and only ever fetched on asking.
               Kept long enough that re-reading a trait is instant, and capped
               because there are 7,179 of them. */
            /* Cross-origin now — the compendium is published separately — so
               this matches the path segment rather than a leading slash. Miss
               this and prose silently stops working offline, with nothing
               failing loudly to say so. */
            urlPattern: /\/describe\/.*\.json$/,
            handler: "CacheFirst",
            options: { cacheName: "prose", expiration: { maxEntries: 120 } },
          },
          {
            urlPattern: /\/index\/.*\.json$/,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "compendium", expiration: { maxEntries: 12 } },
          },
        ],
        // The room is a live socket; it must never be served from a cache.
        navigateFallbackDenylist: [/^\/room\//],
      },
    }),
  ],
  define: { __CONTENT_VERSION__: JSON.stringify(contentVersion) },
  publicDir: "public",
  build: { target: "es2023" },
});
