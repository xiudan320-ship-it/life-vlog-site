import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

function generatedAssetsPlugin() {
  return {
    name: "generated-assets",
    async generateBundle() {
      const directory = join(process.cwd(), "assets", "generated");
      for (const name of await readdir(directory)) {
        this.emitFile({ type: "asset", fileName: `assets/generated/${name}`, source: await readFile(join(directory, name)) });
      }
    },
  };
}

function compactIndexHtmlPlugin() {
  return {
    name: "compact-index-html",
    transformIndexHtml(html) {
      return html.replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim();
    },
  };
}

export default defineConfig({
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "assets",
    sourcemap: false,
    minify: "terser",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/[/\\]modules[/\\](?:today-mood-controller|mood-diary-repository|mood-diary-shared)\.js$/u.test(id)) return "today-mood";
        },
      },
    },
  },
  plugins: [generatedAssetsPlugin(), compactIndexHtmlPlugin(), VitePWA({
    strategies: "injectManifest",
    srcDir: "src",
    filename: "sw.js",
    registerType: "prompt",
    injectRegister: false,
    manifest: {
      id: "/",
      name: "咻蛋之家",
      short_name: "咻蛋之家",
      description: "收藏生活里的日记、菜谱、心愿、纪念日与家庭留言。",
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#f2f4ef",
      theme_color: "#0d100f",
      categories: ["lifestyle", "photo", "productivity"],
      icons: [
        { src: "/assets/generated/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/assets/generated/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/assets/generated/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    injectManifest: {
      globPatterns: ["**/*.{js,css,html,webmanifest,png,webp}"],
      globIgnores: [
        "**/*-route-*.js",
        "**/*-route-*.css",
        "**/photo-editor-controller-*.js",
        "**/mobile-diary-controller-*.js",
        "**/photo-viewer-controller-*.js",
        "**/assets/generated/*",
      ],
    },
  })],
});
