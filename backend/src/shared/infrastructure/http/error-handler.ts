import type { ErrorRequestHandler, RequestHandler } from "express";

export const apiNotFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Erro interno" });
};
