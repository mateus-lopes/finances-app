import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET deve ter no mínimo 32 caracteres"),
  // Senha exigida pela tela /redefinir-senha. Vazia = redefinição desabilitada.
  ADMIN_RESET_PASSWORD: z.string().default(""),
  GEMINI_API_KEY: z.string().default(""),
});

export type AppConfig = z.infer<typeof configSchema>;

/**
 * Valida a configuração vinda do ambiente: `process.env` no Node (dev/testes)
 * ou os vars/secrets do Worker no Cloudflare.
 */
export function parseConfig(source: Record<string, unknown>): AppConfig {
  const parsed = configSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Variáveis de ambiente inválidas: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
  }
  return parsed.data;
}

export const isProduction = (config: AppConfig) => config.NODE_ENV === "production";
