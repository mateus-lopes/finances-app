import { defineStore } from "pinia";
import { ref } from "vue";
import { accountsApi } from "../api";
import type { Account, AccountInput } from "../types";

/** Contas compartilhadas entre telas (selects de origem/destino). */
export const useAccountsStore = defineStore("accounts", () => {
  const accounts = ref<Account[]>([]);
  const loading = ref(false);

  async function loadAccounts() {
    loading.value = true;
    try {
      accounts.value = (await accountsApi.list()).accounts;
    } finally {
      loading.value = false;
    }
  }

  async function createAccount(input: AccountInput) {
    const account = await accountsApi.create(input);
    accounts.value.push(account);
    return account;
  }

  async function updateAccount(id: number, input: AccountInput) {
    const account = await accountsApi.update(id, input);
    const idx = accounts.value.findIndex((a) => a.id === id);
    if (idx !== -1) accounts.value[idx] = account;
    return account;
  }

  async function deleteAccount(id: number) {
    await accountsApi.remove(id);
    accounts.value = accounts.value.filter((a) => a.id !== id);
  }

  return { accounts, loading, loadAccounts, createAccount, updateAccount, deleteAccount };
});
