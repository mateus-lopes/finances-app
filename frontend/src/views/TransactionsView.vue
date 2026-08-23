<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useMonthStore } from "../stores/month";
import { useAccountsStore } from "../stores/accounts";
import { useToast } from "../composables/useToast";
import MonthNavigator from "../components/MonthNavigator.vue";
import Skeleton from "../components/ui/Skeleton.vue";
import Dialog from "../components/ui/Dialog.vue";
import Badge from "../components/ui/Badge.vue";
import api from "../services/api";

const monthStore = useMonthStore();
const accountsStore = useAccountsStore();
const { success, error } = useToast();

interface Transaction {
  id: number;
  type: "income" | "expense" | "transfer";
  amount: string;
  date: string;
  description: string;
  fromAccount: { id: number; name: string; color: string | null } | null;
  toAccount: { id: number; name: string; color: string | null } | null;
  category: { id: number; name: string; color: string | null } | null;
}

const transactions = ref<Transaction[]>([]);
const totals = ref({ income: 0, expense: 0, invested: 0, balance: 0 });
const loading = ref(false);
const showDialog = ref(false);
const submitting = ref(false);
const hoverCat = ref<number | null>(null);
const categories = ref<{ id: number; name: string; color: string | null }[]>([]);

const form = ref({
  type: "expense" as "income" | "expense" | "transfer",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  description: "",
  fromAccountId: "",
  toAccountId: "",
  categoryId: "",
});

const inputClass = "flex h-9 w-full rounded-lg border border-input bg-secondary/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const selectClass = "flex h-9 w-full rounded-lg border border-input bg-secondary/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer";

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<{ items: Transaction[]; totals: { income: number; expense: number; balance: number } }>("/transactions", {
      params: { month: monthStore.month, year: monthStore.year },
    });
    transactions.value = data.items;
    totals.value = data.totals;
  } finally { loading.value = false; }
}

async function loadCategories() {
  try {
    const { data } = await api.get<{ id: number; name: string; color: string | null }[]>("/categories");
    categories.value = data;
  } catch {}
}

onMounted(async () => { await Promise.all([load(), accountsStore.loadAccounts(), loadCategories()]); });
watch([() => monthStore.month, () => monthStore.year], load);

function fmt(v: string | number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function openNew() {
  form.value = { type: "expense", amount: "", date: new Date().toISOString().slice(0, 10), description: "", fromAccountId: "", toAccountId: "", categoryId: "" };
  showDialog.value = true;
}

async function submit() {
  if (!form.value.amount || !form.value.description.trim()) return;
  submitting.value = true;
  try {
    await api.post("/transactions", {
      type: form.value.type,
      amount: parseFloat(form.value.amount),
      date: form.value.date,
      description: form.value.description,
      fromAccountId: form.value.fromAccountId ? parseInt(form.value.fromAccountId) : null,
      toAccountId: form.value.toAccountId ? parseInt(form.value.toAccountId) : null,
      categoryId: form.value.categoryId ? parseInt(form.value.categoryId) : null,
    });
    showDialog.value = false;
    await load();
    success("Transação criada");
  } catch { error("Erro ao criar transação"); }
  finally { submitting.value = false; }
}

async function remove(id: number) {
  try {
    await api.delete(`/transactions/${id}`);
    await load();
  } catch { error("Erro ao remover"); }
}

const typeIcon: Record<string, string> = {
  income: `<path d="M7 17L17 7M17 7H7M17 7v10"/>`,
  expense: `<path d="M17 7L7 17M7 17h10M7 17V7"/>`,
  transfer: `<path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>`,
};
const typeColor: Record<string, string> = {
  income: "bg-emerald-500/15 text-emerald-400",
  expense: "bg-rose-500/15 text-rose-400",
  transfer: "bg-blue-500/15 text-blue-400",
};

const totalIncome = computed(() => totals.value.income);
const totalExpense = computed(() => totals.value.expense);
const totalInvested = computed(() => totals.value.invested ?? 0);
const saldoMes = computed(() => totals.value.balance);
</script>

<template>
  <div class="page">
    <div class="flex items-center justify-between mb-5">
      <div class="lg:hidden"><MonthNavigator /></div>
      <button
        type="button"
        @click="openNew"
        class="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ml-auto"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>

    <!-- Totalizadores -->
    <div class="grid gap-3 mb-5" :class="totalInvested > 0 ? 'grid-cols-4' : 'grid-cols-3'">
      <template v-if="loading">
        <Skeleton class="h-16 rounded-xl" v-for="i in (totalInvested > 0 ? 4 : 3)" :key="i" />
      </template>
      <template v-else>
        <div class="rounded-xl border border-border bg-card px-4 py-3">
          <p class="text-xs text-muted-foreground mb-1">Entradas</p>
          <p class="text-sm font-bold text-emerald-400">+{{ fmt(totalIncome) }}</p>
        </div>
        <div class="rounded-xl border border-border bg-card px-4 py-3">
          <p class="text-xs text-muted-foreground mb-1">Saídas</p>
          <p class="text-sm font-bold text-rose-400">-{{ fmt(totalExpense) }}</p>
        </div>
        <div v-if="totalInvested > 0" class="rounded-xl border border-violet-500/30 bg-violet-500/5 px-4 py-3">
          <p class="text-xs text-muted-foreground mb-1">Investido</p>
          <p class="text-sm font-bold text-violet-400">↗{{ fmt(totalInvested) }}</p>
        </div>
        <div class="rounded-xl border border-border bg-card px-4 py-3">
          <p class="text-xs text-muted-foreground mb-1">Saldo</p>
          <p class="text-sm font-bold" :class="saldoMes >= 0 ? 'text-emerald-400' : 'text-rose-400'">
            {{ saldoMes >= 0 ? '+' : '' }}{{ fmt(saldoMes) }}
          </p>
        </div>
      </template>
    </div>

    <template v-if="loading">
      <Skeleton class="h-16 w-full mb-2" v-for="i in 5" :key="i" />
    </template>

    <template v-else>
      <!-- Transações do mês -->
      <template v-if="transactions.length">
        <p class="section-label mb-2">Transações</p>
        <div class="rounded-xl border border-border bg-card overflow-hidden">
          <div
            v-for="(tx, i) in transactions"
            :key="tx.id"
            class="flex items-center gap-3 px-4 py-3 group"
            :class="{ 'border-t border-border': i > 0 }"
          >
            <div :class="['w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', typeColor[tx.type]]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="typeIcon[tx.type]" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5">
                <span
                  v-if="tx.category"
                  class="w-2 h-2 rounded-full flex-shrink-0 cursor-default"
                  :style="{ background: tx.category.color ?? '#8b5cf6' }"
                  @mouseenter="hoverCat = tx.id"
                  @mouseleave="hoverCat = null"
                  @click.stop="hoverCat = hoverCat === tx.id ? null : tx.id"
                />
                <p class="text-sm font-medium text-foreground truncate">{{ tx.description }}</p>
              </div>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span v-if="tx.fromAccount" class="text-xs text-muted-foreground">{{ tx.fromAccount.name }}</span>
                <span v-else-if="tx.toAccount" class="text-xs text-muted-foreground">{{ tx.toAccount.name }}</span>
                <span v-if="tx.fromAccount && tx.toAccount" class="text-xs text-muted-foreground">→ {{ tx.toAccount.name }}</span>
              </div>
              <p v-if="tx.category && hoverCat === tx.id" class="text-xs mt-0.5 uppercase tracking-wide" :style="{ color: tx.category.color ?? '#8b5cf6' }">{{ tx.category.name }}</p>
            </div>
            <div class="flex flex-col items-end gap-1">
              <span class="text-sm font-semibold tabular-nums" :class="tx.type === 'income' ? 'text-emerald-400' : tx.type === 'expense' ? 'text-rose-400' : 'text-blue-400'">
                {{ tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '' }}{{ fmt(tx.amount) }}
              </span>
              <span class="text-xs text-muted-foreground">{{ fmtDate(tx.date) }}</span>
            </div>
            <button
              type="button"
              @click="remove(tx.id)"
              class="ml-1 h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </button>
          </div>
        </div>
      </template>

      <div v-else class="flex flex-col items-center justify-center py-20 text-center">
        <div class="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted-foreground">
            <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
          </svg>
        </div>
        <p class="text-sm text-muted-foreground">Nenhuma transação neste mês</p>
      </div>
    </template>

    <!-- Dialog nova transação -->
    <Dialog :open="showDialog" title="Nova transação" @update:open="showDialog = $event">
      <div class="flex gap-1.5 mb-4 p-1 bg-secondary rounded-lg">
        <button v-for="t in [['expense','Despesa'],['income','Receita'],['transfer','Transf.']]" :key="t[0]" type="button"
          @click="form.type = t[0] as typeof form.type"
          :class="['flex-1 h-8 rounded-md text-xs font-medium transition-all', form.type === t[0] ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground']">
          {{ t[1] }}
        </button>
      </div>
      <div class="space-y-3">
        <div><label class="text-xs text-muted-foreground block mb-1">Descrição</label>
          <input v-model="form.description" :class="inputClass" placeholder="Ex: Almoço..." autofocus />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div><label class="text-xs text-muted-foreground block mb-1">Valor</label>
            <input v-model="form.amount" :class="inputClass" type="number" step="0.01" placeholder="0,00" />
          </div>
          <div><label class="text-xs text-muted-foreground block mb-1">Data</label>
            <input v-model="form.date" :class="inputClass" type="date" />
          </div>
        </div>
        <div v-if="form.type !== 'income'">
          <label class="text-xs text-muted-foreground block mb-1">{{ form.type === 'transfer' ? 'De' : 'Conta' }}</label>
          <select v-model="form.fromAccountId" :class="selectClass">
            <option value="">Não especificar</option>
            <option v-for="a in accountsStore.accounts.filter(a => ['checking','savings','cash','credit_card'].includes(a.type))" :key="a.id" :value="String(a.id)">{{ a.name }}</option>
          </select>
        </div>
        <div v-if="form.type !== 'expense'">
          <label class="text-xs text-muted-foreground block mb-1">{{ form.type === 'transfer' ? 'Para' : 'Conta' }}</label>
          <select v-model="form.toAccountId" :class="selectClass">
            <option value="">Não especificar</option>
            <option v-for="a in accountsStore.accounts.filter(a => ['checking','savings','cash','investment'].includes(a.type))" :key="a.id" :value="String(a.id)">{{ a.name }}</option>
          </select>
        </div>
        <div v-if="form.type !== 'transfer' && categories.length">
          <label class="text-xs text-muted-foreground block mb-1">Categoria</label>
          <select v-model="form.categoryId" :class="selectClass">
            <option value="">Sem categoria</option>
            <option v-for="c in categories" :key="c.id" :value="String(c.id)">{{ c.name }}</option>
          </select>
        </div>
        <div class="flex gap-2 pt-1">
          <button type="button" @click="showDialog = false"
            class="flex-1 h-9 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors">Cancelar</button>
          <button type="button" @click="submit" :disabled="submitting || !form.amount || !form.description"
            class="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <svg v-if="submitting" class="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Salvar
          </button>
        </div>
      </div>
    </Dialog>
  </div>
</template>
