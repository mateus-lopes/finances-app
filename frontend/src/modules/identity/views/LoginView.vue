<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../store";

const auth = useAuthStore();
const router = useRouter();

const form = ref({ email: "", password: "" });
const error = ref("");
const loading = ref(false);

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    await auth.login(form.value.email, form.value.password);
    await router.push("/");
  } catch {
    error.value = "E-mail ou senha inválidos";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-dvh flex items-center justify-center px-6 bg-background">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="flex flex-col items-center gap-3 mb-10">
        <div class="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" fill="currentColor" class="text-primary"/>
          </svg>
        </div>
        <div class="text-center">
          <h1 class="text-xl font-bold text-foreground">Controle Financeiro</h1>
          <p class="text-sm text-muted-foreground mt-1">Faça login para continuar</p>
        </div>
      </div>

      <form @submit.prevent="submit" class="space-y-4">
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-muted-foreground">E-mail</label>
          <input
            v-model="form.email"
            type="email"
            placeholder="seu@email.com"
            autocomplete="email"
            required
            class="flex h-10 w-full rounded-lg border border-input bg-secondary/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-medium text-muted-foreground">Senha</label>
          <input
            v-model="form.password"
            type="password"
            placeholder="••••••••"
            autocomplete="current-password"
            required
            class="flex h-10 w-full rounded-lg border border-input bg-secondary/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <p v-if="error" class="text-xs text-red-400 flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {{ error }}
        </p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg v-if="loading" class="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          {{ loading ? "Entrando..." : "Entrar" }}
        </button>
      </form>

      <div class="mt-4 text-center">
        <RouterLink to="/redefinir-senha" class="text-xs text-muted-foreground hover:text-primary transition-colors">
          Esqueceu a senha?
        </RouterLink>
      </div>
    </div>
  </div>
</template>
