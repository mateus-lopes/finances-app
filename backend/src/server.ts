import { serve } from "@hono/node-server";
import app from "./app";

const port = Number(process.env.PORT ?? 3001);

// Dev local: o Vite (porta 5174) faz proxy de /api para cá.
serve({ fetch: app.fetch, port }, () => {
  console.log(`API rodando em http://localhost:${port}`);
});
