import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../../../shared/infrastructure/http/async-handler";
import { userIdOf, type RequireAuth } from "../../../../shared/infrastructure/http/auth-context";
import { parseBody } from "../../../../shared/infrastructure/http/validation";
import type { PreviewImport } from "../../application/use-cases/preview-import";
import type { ConfirmImport } from "../../application/use-cases/confirm-import";

const previewSchema = z.object({ content: z.string().min(1) });

const confirmSchema = z.object({
  accountId: z.number().int().nullable(),
  items: z.array(
    z.object({
      fitid: z.string(),
      date: z.string(),
      amount: z.number(),
      type: z.enum(["income", "expense", "transfer"]),
      description: z.string(),
      categoryId: z.number().int().nullable().optional(),
      toAccountId: z.number().int().nullable().optional(),
    }),
  ),
});

export interface ImportRouterDeps {
  requireAuth: RequireAuth;
  previewImport: PreviewImport;
  confirmImport: ConfirmImport;
}

export function createImportRouter({ requireAuth, previewImport, confirmImport }: ImportRouterDeps) {
  const router = Router();
  router.use(requireAuth);

  router.post("/ofx/preview", asyncHandler(async (req, res) => {
    const body = parseBody(previewSchema, req.body, res);
    if (!body) return;
    const items = await previewImport.execute(userIdOf(req), body.content);
    res.json({
      items,
      total: items.length,
      duplicates: items.filter((i) => i.duplicate).length,
    });
  }));

  router.post("/ofx/confirm", asyncHandler(async (req, res) => {
    const body = parseBody(confirmSchema, req.body, res);
    if (!body) return;
    const items = body.items.map((i) => ({ ...i, categoryId: i.categoryId ?? null, toAccountId: i.toAccountId ?? null }));
    res.json({ imported: await confirmImport.execute(userIdOf(req), items, body.accountId) });
  }));

  return router;
}
