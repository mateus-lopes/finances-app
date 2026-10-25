import { Hono } from "hono";
import { z } from "zod";
import { userIdOf, type AppEnv, type RequireAuth } from "../../../../shared/infrastructure/http/auth-context";
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
  const router = new Hono<AppEnv>();
  router.use(requireAuth);

  router.post("/ofx/preview", async (c) => {
    const body = await parseBody(c, previewSchema);
    const items = await previewImport.execute(userIdOf(c), body.content);
    return c.json({
      items,
      total: items.length,
      duplicates: items.filter((i) => i.duplicate).length,
    });
  });

  router.post("/ofx/confirm", async (c) => {
    const body = await parseBody(c, confirmSchema);
    const items = body.items.map((i) => ({ ...i, categoryId: i.categoryId ?? null, toAccountId: i.toAccountId ?? null }));
    return c.json({ imported: await confirmImport.execute(userIdOf(c), items, body.accountId) });
  });

  return router;
}
