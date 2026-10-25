import type { ErrorHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";

export const apiNotFound: NotFoundHandler = (c) => c.json({ error: "Rota não encontrada" }, 404);

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  console.error(err);
  return c.json({ error: "Erro interno" }, 500);
};
