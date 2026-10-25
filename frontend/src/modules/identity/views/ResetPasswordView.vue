<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { apiErrorMessage } from "@/shared/api/errors";
import { authApi } from "../api";

const router = useRouter();

const form = ref({ email: "", adminPassword: "", newPassword: "", confirm: "" });
const error = ref("");
const success = ref(false);
const loading = ref(false);

const passwordValid = computed(() => {
  const p = form.value.newPassword;
  return p.length >= 8 && /[a-zA-Z]/.test(p) && /[0-9]/.test(p);
});

const passwordsMatch = computed(() => form.value.newPassword === form.value.confirm);

async function submit() {
  error.value = "";
  if (!passwordValid.value) {
    error.value = "A senha deve ter ao menos 8 caracteres, letras e números";
    return;
  }
  if (!passwordsMatch.value) {
    error.value = "As senhas não coincidem";
    return;
  }
  loading.value = true;
  try {
    await authApi.resetPassword({
      adminPassword: form.value.adminPassword,
      email: form.value.email,
      newPassword: form.value.newPassword,
    });
    success.value = true;
  } catch (e) {
    error.value = apiErrorMessage(e, "Erro ao redefinir senha");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-dvh flex items-center justify-center px-6 bg-background">
    <div class="w-full max-w-sm">
      <div class="flex flex-col items-center gap-3 mb-10">
        <div class="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-primary">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div class="text-center">
          <h1 class="text-xl font-bold text-foreground">Redefinir Senha</h1>
          <p class="text-sm text-muted-foreground mt-1">Informe a senha admin para continuar</p>
        </div>
      </div>

      <div v-if="success" class="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-center space-y-3">
        <p class="text-sm text-green-400 font-medium">Senha redefinida com sucesso!</p>
        <button
          @click="router.push('/login')"
          class="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          Voltar ao login
        </button>
      </div>

      <form v-else @submit.prevent="submit" class="space-y-4">
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-muted-foreground">E-mail da conta</label>
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
          <label class="text-xs font-medium text-muted-foreground">Senha admin</label>
          <input
            v-model="form.adminPassword"
            type="password"
            placeholder="••••••••"
            required
            class="flex h-10 w-full rounded-lg border border-input bg-secondary/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-medium text-muted-foreground">Nova senha</label>
          <input
            v-model="form.newPassword"
            type="password"
            placeholder="Mínimo 8 caracteres, letras e números"
            required
            class="flex h-10 w-full rounded-lg border border-input bg-secondary/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p v-if="form.newPassword && !passwordValid" class="text-xs text-amber-400">
            Mínimo 8 caracteres com letras e números
          </p>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-medium text-muted-foreground">Confirmar nova senha</label>
          <input
            v-model="form.confirm"
            type="password"
            placeholder="••••••••"
            required
            class="flex h-10 w-full rounded-lg border border-input bg-secondary/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p v-if="form.confirm && !passwordsMatch" class="text-xs text-amber-400">
            As senhas não coincidem
          </p>
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
          {{ loading ? "Redefinindo..." : "Redefinir senha" }}
        </button>

        <div class="text-center">
          <RouterLink to="/login" class="text-xs text-muted-foreground hover:text-primary transition-colors">
            Voltar ao login
          </RouterLink>
        </div>
      </form>
    </div>
  </div>
</template>
