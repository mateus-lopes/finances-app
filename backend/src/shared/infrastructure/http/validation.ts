import { z } from "zod";
import type { Request, Response } from "express";

export const periodQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});

/** Lê `:id` numérico; responde 400 e retorna null quando inválido. */
export function parseIdParam(req: Request, res: Response): number | null {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return null;
  }
  return id;
}

/** Valida com Zod; responde 400 com o erro achatado e retorna null quando inválido. */
export function parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown, res: Response): z.infer<T> | null {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return null;
  }
  return parsed.data;
}
