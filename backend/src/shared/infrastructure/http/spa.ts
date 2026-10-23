import express, { type Express } from "express";
import path from "node:path";

/**
 * Serve o build do Vue: assets com hash ficam em cache "eterno"; index.html
 * e service worker nunca são cacheados (senão o PWA não percebe deploys novos).
 * Qualquer GET fora de /api cai no index.html (history mode do vue-router).
 */
export function serveSpa(app: Express, staticDir: string) {
  const indexHtml = path.join(staticDir, "index.html");

  app.use(express.static(staticDir, {
    index: false,
    setHeaders(res, filePath) {
      const isHashedAsset = filePath.includes(`${path.sep}assets${path.sep}`);
      res.setHeader("Cache-Control", isHashedAsset ? "public, max-age=31536000, immutable" : "no-cache");
    },
  }));

  app.get(/^(?!\/api(\/|$)).*/, (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(indexHtml);
  });
}
