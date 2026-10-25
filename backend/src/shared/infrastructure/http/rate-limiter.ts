/** Limita tentativas por chave (ex.: IP). `true` = pode prosseguir. */
export interface RateLimiter {
  allow(key: string): Promise<boolean>;
}

/** Binding de Rate Limiting do Cloudflare Workers (configurado no wrangler.jsonc). */
export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export function cloudflareRateLimiter(binding: RateLimitBinding): RateLimiter {
  return { allow: async (key) => (await binding.limit({ key })).success };
}

/** Janela fixa em memória — para o servidor Node local e testes (um único processo). */
export function memoryRateLimiter(max: number, windowMs: number): RateLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return {
    async allow(key) {
      const now = Date.now();
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }
      entry.count += 1;
      return entry.count <= max;
    },
  };
}
