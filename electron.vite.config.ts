import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  main: {
    // music-metadata is pure ESM and must be bundled into our CJS main bundle
    // rather than require()-d. It lives in devDependencies (which this plugin
    // never externalizes); the explicit exclude keeps that true if it ever
    // moves back to dependencies.
    plugins: [externalizeDepsPlugin({ exclude: ["music-metadata"] })],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    resolve: {
      alias: {
        "@": resolve("src/renderer"),
        "@shared": resolve("src/shared"),
      },
    },
    plugins: [react(), tailwindcss()],
  },
});
