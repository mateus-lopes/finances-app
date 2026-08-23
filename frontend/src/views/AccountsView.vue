<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useAccountsStore, type Account } from "../stores/accounts";
import { useMonthStore } from "../stores/month";
import { useToast } from "../composables/useToast";
import MonthNavigator from "../components/MonthNavigator.vue";
import Skeleton from "../components/ui/Skeleton.vue";
import Dialog from "../components/ui/Dialog.vue";
import Badge from "../components/ui/Badge.vue";
import Progress from "../components/ui/Progress.vue";
import api from "../services/api";

const store = useAccountsStore();
const monthStore = useMonthStore();
const { success, error } = useToast();

const showDialog = ref(false);
const submitting = ref(false);
const form = ref({ name: "", type: "checking" as Account["type"], color: "#8b5cf6", targetAmount: "", showProgress: false, isReal: false, initialBalance: "" });

// Dialog de edição
const editDialog = ref(false);
const editSubmitting = ref(false);
const editingId = ref<number | null>(null);
const editForm = ref({ name: "", type: "checking" as Account["type"], color: "#8b5cf6", targetAmount: "", currentAmount: "", showProgress: false, isReal: false });

// Dialog de confirmação de delete
const deleteDialog = ref(false);
const deletingAccount = ref<{ id: number; name: string } | null>(null);

// Dialog de pagamento de fatura
const payDialog = ref(false);
const paySubmitting = ref(false);
const payingCard = ref<{ id: number; name: string; amount: number } | null>(null);
const payFromAccountId = ref<string>("");

const typeOptions = [
  { value: "checking", label: "Conta Corrente" },
  { value: "savings", label: "Poupança" },
  { value: "cash", label: "Dinheiro" },
  { value: "credit_card", label: "Cartão de Crédito" },
  { value: "investment", label: "Investimento" },
];

const inputClass = "flex h-9 w-full rounded-lg border border-input bg-secondary/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const selectClass = "flex h-9 w-full rounded-lg border border-input bg-secondary/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer";

const typeIcon: Record<string, string> = {
  checking: `<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`,
  savings: `<path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>`,
  cash: `<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>`,
  credit_card: `<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>`,
  investment: `<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>`,
};

const accounts = ref<(Account & { balance: number })[]>([]);
const accountSummary = ref({ liquidTotal: 0, investmentTotal: 0, openInvoiceTotal: 0 });
const loading = ref(false);
const invoiceCache = ref<Record<string, { amount: number; paid: boolean }>>({});

const assetAccounts = computed(() => accounts.value.filter(a => ["checking", "savings", "cash"].includes(a.type)));
const creditCards = computed(() => accounts.value.filter(a => a.type === "credit_card"));
const investments = computed(() => accounts.value.filter(a => a.type === "investment"));
const checkingAccounts = computed(() => accounts.value.filter(a => ["checking", "savings", "cash"].includes(a.type)));

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<{ accounts: (Account & { balance: number })[]; summary: typeof accountSummary.value }>("/accounts", {
      params: { month: monthStore.month, year: monthStore.year },
    });
    accounts.value = data.accounts;
    accountSummary.value = data.summary;
    for (const cc of data.accounts.filter(a => a.type === "credit_card")) {
      await loadInvoice(cc.id);
    }
  } finally {
    loading.value = false;
  }
}

watch([() => monthStore.month, () => monthStore.year], load, { immediate: true });

function fmt(v: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));
}
function pct(current: string, target: string | null) {
  if (!target || parseFloat(target) === 0) return 0;
  return Math.min(100, (parseFloat(current) / parseFloat(target)) * 100);
}

async function loadInvoice(accountId: number) {
  const key = `${accountId}-${monthStore.month}-${monthStore.year}`;
  try {
    const { data } = await api.get(`/accounts/${accountId}/invoice`, { params: { month: monthStore.month, year: monthStore.year } });
    invoiceCache.value[key] = { amount: data.amount, paid: data.paid };
  } catch { /* ignore */ }
}

function handleCardClick(cc: Account & { balance: number }) {
  const key = `${cc.id}-${monthStore.month}-${monthStore.year}`;
  const inv = invoiceCache.value[key];
  if (inv?.paid) {
    toggleInvoice(cc.id, null);
  } else {
    payingCard.value = { id: cc.id, name: cc.name, amount: inv?.amount ?? 0 };
    payFromAccountId.value = String(checkingAccounts.value[0]?.id ?? "");
    payDialog.value = true;
  }
}

async function confirmPayment() {
  if (!payingCard.value || !payFromAccountId.value) return;
  paySubmitting.value = true;
  try {
    await toggleInvoice(payingCard.value.id, parseInt(payFromAccountId.value));
    payDialog.value = false;
  } finally {
    paySubmitting.value = false;
  }
}

async function toggleInvoice(accountId: number, fromAccountId: number | null) {
  try {
    await api.patch(`/accounts/${accountId}/invoice/pay`, {
      month: monthStore.month,
      year: monthStore.year,
      fromAccountId,
    });
    const key = `${accountId}-${monthStore.month}-${monthStore.year}`;
    delete invoiceCache.value[key];
    await loadInvoice(accountId);
    await load();
  } catch { error("Erro ao atualizar fatura"); }
}

function openNew() {
  form.value = { name: "", type: "checking", color: "#8b5cf6", targetAmount: "", showProgress: false, isReal: false, initialBalance: "" };
  showDialog.value = true;
}

async function submit() {
  if (!form.value.name.trim()) return;
  submitting.value = true;
  try {
    await store.createAccount({
      name: form.value.name, type: form.value.type, color: form.value.color,
      targetAmount: form.value.targetAmount ? parseFloat(form.value.targetAmount) : null,
      showProgress: form.value.showProgress,
      isReal: form.value.isReal,
      initialBalance: form.value.initialBalance ? parseFloat(form.value.initialBalance) : undefined,
    });
    showDialog.value = false;
    await load();
    success("Conta criada");
  } catch { error("Erro ao criar conta"); }
  finally { submitting.value = false; }
}

function openEdit(acc: Account & { balance: number }) {
  editingId.value = acc.id;
  editForm.value = {
    name: acc.name,
    type: acc.type,
    color: acc.color ?? "#8b5cf6",
    targetAmount: acc.targetAmount ?? "",
    currentAmount: acc.currentAmount ?? "",
    showProgress: acc.showProgress ?? false,
    isReal: acc.isReal ?? false,
  };
  editDialog.value = true;
}

async function submitEdit() {
  if (!editForm.value.name.trim() || !editingId.value) return;
  editSubmitting.value = true;
  try {
    await store.updateAccount(editingId.value, {
      name: editForm.value.name,
      type: editForm.value.type,
      color: editForm.value.color,
      targetAmount: editForm.value.targetAmount ? String(parseFloat(editForm.value.targetAmount)) : null,
      currentAmount: editForm.value.currentAmount ? String(parseFloat(editForm.value.currentAmount)) : undefined,
      showProgress: editForm.value.showProgress,
      isReal: editForm.value.isReal,
    });
    editDialog.value = false;
    await load();
    success("Conta atualizada");
  } catch { error("Erro ao atualizar conta"); }
  finally { editSubmitting.value = false; }
}

function confirmDelete(acc: Account) {
  deletingAccount.value = { id: acc.id, name: acc.name };
  deleteDialog.value = true;
}

async function executeDelete() {
  if (!deletingAccount.value) return;
  try {
    await store.deleteAccount(deletingAccount.value.id);
    deleteDialog.value = false;
    await load();
    success("Conta removida");
  } catch { error("Erro ao remover"); }
}
</script>

<template>
  <div class="page">
    <div class="flex items-center justify-between mb-5">
      <div class="lg:hidden"><MonthNavigator /></div>
      <button type="button" @click="openNew"
        class="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ml-auto">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>

    <!-- Totalizadores -->
    <div class="grid grid-cols-3 gap-3 mb-5">
      <template v-if="loading">
        <Skeleton class="h-16 rounded-xl" v-for="i in 3" :key="i" />
      </template>
      <template v-else>
        <div class="rounded-xl border border-border bg-card px-4 py-3">
          <p class="text-xs text-muted-foreground mb-1">Líquido</p>
          <p class="text-sm font-bold" :class="accountSummary.liquidTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'">{{ fmt(accountSummary.liquidTotal) }}</p>
        </div>
        <div class="rounded-xl border border-border bg-card px-4 py-3">
          <p class="text-xs text-muted-foreground mb-1">Investido</p>
          <p class="text-sm font-bold text-emerald-400">{{ fmt(accountSummary.investmentTotal) }}</p>
        </div>
        <div class="rounded-xl border border-border bg-card px-4 py-3">
          <p class="text-xs text-muted-foreground mb-1">Fatura aberta</p>
          <p class="text-sm font-bold" :class="accountSummary.openInvoiceTotal > 0 ? 'text-rose-400' : 'text-muted-foreground'">{{ fmt(accountSummary.openInvoiceTotal) }}</p>
        </div>
      </template>
    </div>

    <template v-if="loading">
      <Skeleton class="h-16 w-full mb-2" v-for="i in 3" :key="i" />
    </template>

    <template v-else>
      <!-- Contas bancárias -->
      <template v-if="assetAccounts.length">
        <p class="section-label">Contas bancárias</p>
        <div class="rounded-xl border border-border bg-card overflow-hidden mb-5">
          <div v-for="(acc, i) in assetAccounts" :key="acc.id" class="flex items-center gap-3 px-4 py-3 group" :class="{ 'border-t border-border': i > 0 }">
            <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" :style="{ background: (acc.color ?? '#8b5cf6') + '20', color: acc.color ?? '#8b5cf6' }">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" v-html="typeIcon[acc.type]" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-foreground">{{ acc.name }}</p>
              <p class="text-xs text-muted-foreground">{{ typeOptions.find(t => t.value === acc.type)?.label }}</p>
            </div>
            <div class="flex items-center gap-1">
              <span class="text-sm font-semibold" :class="acc.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'">{{ fmt(acc.balance) }}</span>
              <button type="button" @click="openEdit(acc)" class="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button type="button" @click="confirmDelete(acc)" class="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Cartões -->
      <template v-if="creditCards.length">
        <p class="section-label">Cartões de crédito</p>
        <div class="rounded-xl border border-border bg-card overflow-hidden mb-5">
          <div v-for="(cc, i) in creditCards" :key="cc.id" class="group" :class="{ 'border-t border-border': i > 0 }">
            <button type="button" @click="handleCardClick(cc)" class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors">
              <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" :style="{ background: (cc.color ?? '#8b5cf6') + '20', color: cc.color ?? '#8b5cf6' }">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" v-html="typeIcon['credit_card']" />
              </div>
              <div class="flex-1 min-w-0 text-left">
                <p class="text-sm font-medium text-foreground">{{ cc.name }}</p>
                <p class="text-xs text-muted-foreground">Fatura {{ monthStore.label }}</p>
              </div>
              <div class="flex items-center gap-2">
                <template v-if="invoiceCache[`${cc.id}-${monthStore.month}-${monthStore.year}`]">
                  <span class="text-sm font-semibold text-rose-400">{{ fmt(invoiceCache[`${cc.id}-${monthStore.month}-${monthStore.year}`].amount) }}</span>
                  <Badge :variant="invoiceCache[`${cc.id}-${monthStore.month}-${monthStore.year}`].paid ? 'success' : 'warning'">
                    {{ invoiceCache[`${cc.id}-${monthStore.month}-${monthStore.year}`].paid ? 'Pago' : 'Aberto' }}
                  </Badge>
                </template>
              </div>
            </button>
            <div class="hidden group-hover:flex items-center gap-1 px-4 pb-2 justify-end">
              <button type="button" @click="openEdit(cc)" class="h-7 px-2 rounded-md flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Editar
              </button>
              <button type="button" @click="confirmDelete(cc)" class="h-7 px-2 rounded-md flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                Remover
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Investimentos -->
      <template v-if="investments.length">
        <p class="section-label">Investimentos</p>
        <div class="rounded-xl border border-border bg-card overflow-hidden mb-5">
          <div v-for="(inv, i) in investments" :key="inv.id" class="px-4 py-3 group" :class="{ 'border-t border-border': i > 0 }">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="1.75" v-html="typeIcon['investment']" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-foreground">{{ inv.name }}</p>
                <p class="text-xs text-muted-foreground">{{ fmt(inv.currentAmount) }} acumulado</p>
              </div>
              <div class="flex items-center gap-1">
                <span class="text-sm font-semibold text-emerald-400">{{ fmt(inv.balance - parseFloat(inv.currentAmount ?? '0')) }}</span>
                <button type="button" @click="openEdit(inv)" class="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button type="button" @click.stop="confirmDelete(inv)" class="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                </button>
              </div>
            </div>
            <template v-if="inv.showProgress && inv.targetAmount">
              <Progress :value="pct(inv.currentAmount, inv.targetAmount)" class="mt-3" color="#34d399" />
              <div class="flex justify-between mt-1">
                <span class="text-xs text-muted-foreground">{{ fmt(inv.currentAmount) }}</span>
                <span class="text-xs text-muted-foreground">Meta: {{ fmt(inv.targetAmount) }}</span>
              </div>
            </template>
          </div>
        </div>
      </template>

      <div v-if="!accounts.length" class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted-foreground">
            <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
          </svg>
        </div>
        <p class="text-sm text-muted-foreground">Nenhuma conta cadastrada</p>
      </div>
    </template>

    <!-- Dialog nova conta -->
    <Dialog :open="showDialog" title="Nova conta" @update:open="showDialog = $event">
      <div class="space-y-3">
        <div><label class="text-xs text-muted-foreground block mb-1">Nome</label>
          <input v-model="form.name" :class="inputClass" placeholder="Ex: Nubank, Itaú..." autofocus />
        </div>
        <div><label class="text-xs text-muted-foreground block mb-1">Tipo</label>
          <select v-model="form.type" :class="selectClass">
            <option v-for="t in typeOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex-1"><label class="text-xs text-muted-foreground block mb-1">Cor</label></div>
          <input type="color" v-model="form.color" class="h-9 w-16 rounded-lg border border-input cursor-pointer bg-secondary/60" />
        </div>
        <template v-if="form.type === 'investment'">
          <div><label class="text-xs text-muted-foreground block mb-1">Meta (R$, opcional)</label>
            <input v-model="form.targetAmount" :class="inputClass" type="number" step="0.01" placeholder="50000,00" />
          </div>
          <div class="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2.5">
            <label class="text-sm text-foreground">Mostrar progresso</label>
            <button type="button" @click="form.showProgress = !form.showProgress"
              :class="['relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors', form.showProgress ? 'bg-primary' : 'bg-muted']">
              <span :class="['pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform', form.showProgress ? 'translate-x-4' : 'translate-x-0']" />
            </button>
          </div>
        </template>
        <template v-if="['checking','savings','cash'].includes(form.type)">
          <div class="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2.5">
            <div>
              <label class="text-sm text-foreground">Conta real</label>
              <p class="text-xs text-muted-foreground">Inclui no Saldo Real (contas bancárias)</p>
            </div>
            <button type="button" @click="form.isReal = !form.isReal"
              :class="['relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors', form.isReal ? 'bg-primary' : 'bg-muted']">
              <span :class="['pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform', form.isReal ? 'translate-x-4' : 'translate-x-0']" />
            </button>
          </div>
          <template v-if="form.isReal">
            <div><label class="text-xs text-muted-foreground block mb-1">Saldo inicial (R$)</label>
              <input v-model="form.initialBalance" :class="inputClass" type="number" step="0.01" placeholder="0,00" />
            </div>
          </template>
        </template>
        <div class="flex gap-2 pt-1">
          <button type="button" @click="showDialog = false" class="flex-1 h-9 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors">Cancelar</button>
          <button type="button" @click="submit" :disabled="submitting || !form.name" class="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <svg v-if="submitting" class="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Criar conta
          </button>
        </div>
      </div>
    </Dialog>

    <!-- Dialog editar conta -->
    <Dialog :open="editDialog" title="Editar conta" @update:open="editDialog = $event">
      <div class="space-y-3">
        <div><label class="text-xs text-muted-foreground block mb-1">Nome</label>
          <input v-model="editForm.name" :class="inputClass" autofocus />
        </div>
        <div><label class="text-xs text-muted-foreground block mb-1">Tipo</label>
          <select v-model="editForm.type" :class="selectClass">
            <option v-for="t in typeOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex-1"><label class="text-xs text-muted-foreground block mb-1">Cor</label></div>
          <input type="color" v-model="editForm.color" class="h-9 w-16 rounded-lg border border-input cursor-pointer bg-secondary/60" />
        </div>
        <template v-if="editForm.type === 'investment'">
          <div><label class="text-xs text-muted-foreground block mb-1">Valor acumulado (R$)</label>
            <input v-model="editForm.currentAmount" :class="inputClass" type="number" step="0.01" placeholder="0,00" />
          </div>
          <div><label class="text-xs text-muted-foreground block mb-1">Meta (R$, opcional)</label>
            <input v-model="editForm.targetAmount" :class="inputClass" type="number" step="0.01" placeholder="50000,00" />
          </div>
          <div class="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2.5">
            <label class="text-sm text-foreground">Mostrar progresso</label>
            <button type="button" @click="editForm.showProgress = !editForm.showProgress"
              :class="['relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors', editForm.showProgress ? 'bg-primary' : 'bg-muted']">
              <span :class="['pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform', editForm.showProgress ? 'translate-x-4' : 'translate-x-0']" />
            </button>
          </div>
        </template>
        <template v-if="['checking','savings','cash'].includes(editForm.type)">
          <div class="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2.5">
            <div>
              <label class="text-sm text-foreground">Conta real</label>
              <p class="text-xs text-muted-foreground">Inclui no Saldo Real</p>
            </div>
            <button type="button" @click="editForm.isReal = !editForm.isReal"
              :class="['relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors', editForm.isReal ? 'bg-primary' : 'bg-muted']">
              <span :class="['pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform', editForm.isReal ? 'translate-x-4' : 'translate-x-0']" />
            </button>
          </div>
        </template>
        <div class="flex gap-2 pt-1">
          <button type="button" @click="editDialog = false" class="flex-1 h-9 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors">Cancelar</button>
          <button type="button" @click="submitEdit" :disabled="editSubmitting || !editForm.name" class="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <svg v-if="editSubmitting" class="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Salvar
          </button>
        </div>
      </div>
    </Dialog>

    <!-- Dialog confirmação de remoção -->
    <Dialog :open="deleteDialog" title="Remover conta" @update:open="deleteDialog = $event">
      <div class="space-y-4">
        <p class="text-sm text-muted-foreground">
          Tem certeza que deseja remover <span class="text-foreground font-medium">{{ deletingAccount?.name }}</span>?
          As transações vinculadas a essa conta não serão apagadas.
        </p>
        <div class="flex gap-2">
          <button type="button" @click="deleteDialog = false" class="flex-1 h-9 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors">Cancelar</button>
          <button type="button" @click="executeDelete" class="flex-1 h-9 rounded-lg bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 transition-colors">
            Remover
          </button>
        </div>
      </div>
    </Dialog>

    <!-- Dialog pagamento de fatura -->
    <Dialog :open="payDialog" :title="`Pagar fatura — ${payingCard?.name}`" @update:open="payDialog = $event">
      <div class="space-y-4">
        <div class="rounded-lg bg-secondary/60 px-4 py-3 flex justify-between items-center">
          <span class="text-sm text-muted-foreground">Valor da fatura</span>
          <span class="text-lg font-bold text-rose-400">{{ fmt(payingCard?.amount ?? 0) }}</span>
        </div>
        <div>
          <label class="text-xs text-muted-foreground block mb-1">Pagar de qual conta?</label>
          <select v-model="payFromAccountId" :class="selectClass">
            <option v-for="acc in checkingAccounts" :key="acc.id" :value="String(acc.id)">{{ acc.name }}</option>
          </select>
        </div>
        <p class="text-xs text-muted-foreground">O valor será lançado como transferência saindo da conta selecionada.</p>
        <div class="flex gap-2 pt-1">
          <button type="button" @click="payDialog = false" class="flex-1 h-9 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors">Cancelar</button>
          <button type="button" @click="confirmPayment" :disabled="paySubmitting || !payFromAccountId" class="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <svg v-if="paySubmitting" class="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Confirmar pagamento
          </button>
        </div>
      </div>
    </Dialog>
  </div>
</template>
