import { defineStore } from "pinia";
import { ref } from "vue";
import api from "../services/api";

export interface Account {
  id: number;
  name: string;
  type: "checking" | "savings" | "cash" | "credit_card" | "investment";
  color: string | null;
  active: boolean;
  targetAmount: string | null;
  currentAmount: string;
  showProgress: boolean;
  isReal: boolean;
  balance: number;
  createdAt: string;
}

export const useAccountsStore = defineStore("accounts", () => {
  const accounts = ref<Account[]>([]);
  const loading = ref(false);

  async function loadAccounts() {
    loading.value = true;
    try {
      const { data } = await api.get<{ accounts: Account[] }>("/accounts");
      accounts.value = data.accounts;
    } finally {
      loading.value = false;
    }
  }

  async function createAccount(payload: Partial<Account>) {
    const { data } = await api.post<Account>("/accounts", payload);
    accounts.value.push(data);
    return data;
  }

  async function updateAccount(id: number, payload: Partial<Account>) {
    const { data } = await api.put<Account>(`/accounts/${id}`, payload);
    const idx = accounts.value.findIndex((a) => a.id === id);
    if (idx !== -1) accounts.value[idx] = data;
    return data;
  }

  async function deleteAccount(id: number) {
    await api.delete(`/accounts/${id}`);
    accounts.value = accounts.value.filter((a) => a.id !== id);
  }

  return { accounts, loading, loadAccounts, createAccount, updateAccount, deleteAccount };
});
