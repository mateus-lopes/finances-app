import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET deve ter no mínimo 32 caracteres"),
  // Senha exigida pela tela /redefinir-senha. Vazia = redefinição desabilitada.
  ADMIN_RESET_PASSWORD: z.string().default(""),
  GEMINI_API_KEY: z.string().default(""),
  // Diretório do build do frontend servido pelo monólito. Vazio = caminho padrão (frontend/dist).
  STATIC_DIR: z.string().default(""),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas:", parsed.error.flatten());
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
