import { z } from "zod";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

export const periodQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000),
});

/** Interrompe o handler respondendo `status` com `{ error }` (tratado pelo error handler). */
export function httpError(status: 400 | 401 | 404 | 429 | 502, error: unknown): never {
  throw new HTTPException(status, { res: Response.json({ error }, { status }) });
}

/** Lê `:id` numérico; responde 400 quando inválido. */
export function parseIdParam(c: Context): number {
  const id = parseInt(c.req.param("id") ?? "");
  if (isNaN(id)) httpError(400, "ID inválido");
  return id;
}

/** Corpo JSON da requisição; corpo vazio vira `{}` e JSON malformado responde 400. */
export async function readJson(c: Context): Promise<unknown> {
  const text = await c.req.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    httpError(400, "JSON inválido");
  }
}

/** Valida o corpo com Zod; responde 400 com o erro achatado quando inválido. */
export async function parseBody<T extends z.ZodTypeAny>(c: Context, schema: T): Promise<z.infer<T>> {
  const parsed = schema.safeParse(await readJson(c));
  if (!parsed.success) httpError(400, parsed.error.flatten());
  return parsed.data;
}
