import { Hono } from "hono";
import { z } from "zod";
import { userIdOf, type AppEnv, type RequireAuth } from "../../../../shared/infrastructure/http/auth-context";
import { parseBody } from "../../../../shared/infrastructure/http/validation";
import type { AnalyzeFinances } from "../../application/use-cases/analyze-finances";

const analyzeSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export interface AiRouterDeps {
  requireAuth: RequireAuth;
  analyzeFinances: AnalyzeFinances;
}

export function createAiRouter({ requireAuth, analyzeFinances }: AiRouterDeps) {
  const router = new Hono<AppEnv>();
  router.use(requireAuth);

  router.post("/analyze", async (c) => {
    const body = await parseBody(c, analyzeSchema);
    try {
      return c.json({ analysis: await analyzeFinances.execute(userIdOf(c), body) });
    } catch (err) {
      // Falha do provedor de IA é erro de dependência externa, não do servidor.
      const message = err instanceof Error ? err.message : String(err);
      console.error("[ai] analyze error:", message);
      return c.json({ error: message }, 502);
    }
  });

  return router;
}
