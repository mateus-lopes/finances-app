import { defineStore } from "pinia";
import { ref } from "vue";
import { authApi, type User } from "./api";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const isAuthenticated = ref(false);
  const sessionChecked = ref(false);

  async function checkSession() {
    try {
      user.value = await authApi.me();
      isAuthenticated.value = true;
    } catch {
      user.value = null;
      isAuthenticated.value = false;
    } finally {
      sessionChecked.value = true;
    }
  }

  async function login(email: string, password: string) {
    user.value = await authApi.login(email, password);
    isAuthenticated.value = true;
  }

  async function logout() {
    await authApi.logout();
    user.value = null;
    isAuthenticated.value = false;
  }

  return { user, isAuthenticated, sessionChecked, checkSession, login, logout };
});
