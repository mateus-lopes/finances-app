<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useMonthStore } from "../stores/month";
import { useAccountsStore } from "../stores/accounts";
import { useToast } from "../composables/useToast";
import MonthNavigator from "../components/MonthNavigator.vue";
import Skeleton from "../components/ui/Skeleton.vue";
import Dialog from "../components/ui/Dialog.vue";
import Tabs from "../components/ui/Tabs.vue";
import Badge from "../components/ui/Badge.vue";
import api from "../services/api";

const monthStore = useMonthStore();
const accountsStore = useAccountsStore();
const { success, error } = useToast();

interface BillOccurrence { id: number; paid: boolean; paidAt: string | null; amount: string; dueDate: string; }
interface Bill {
  id: number; name: string; type: "income" | "expense" | "transfer"; amount: string;
  frequency: string; startDate: string; endDate: string | null;
  fromAccount: { id: number; name: string } | null; toAccount: { id: number; name: string } | null;
  category: { id: number; name: string; color: string | null } | null; occurrence: BillOccurrence | null;
}

const bills = ref<Bill[]>([]);
type SectionTotals = { total: number; paid: number; pending: number };
const billTotals = ref<{ expenses: SectionTotals; installments: SectionTotals; incomes: SectionTotals; transfers: SectionTotals } | null>(null);
const loading = ref(false);
const showDialog = ref(false);
const submitting = ref(false);
const editingId = ref<number | null>(null);
const hoverCat = ref<number | null>(null);
const activeTab = ref("expense");
const isInstallment = ref(false);
const totalInstallments = ref(12);
const categories = ref<{ id: number; name: string; color: string | null }[]>([]);

const form = ref({
  name: "", type: "expense" as "income" | "expense" | "transfer",
  amount: "", startDate: new Date().toISOString().slice(0, 10),
  fromAccountId: "", toAccountId: "", frequency: "monthly", categoryId: "",
});

const inputClass = "flex h-9 w-full rounded-lg border border-input bg-secondary/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const selectClass = "flex h-9 w-full rounded-lg border border-input bg-secondary/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer";

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<{ items: Bill[]; totals: typeof billTotals.value }>("/bills", { params: { month: monthStore.month, year: monthStore.year } });
    bills.value = data.items;
    billTotals.value = data.totals;
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

const expenses = computed(() => bills.value.filter(b => b.type === "expense" && !b.endDate));
const installments = computed(() => bills.value.filter(b => b.type === "expense" && b.endDate));
const incomes = computed(() => bills.value.filter(b => b.type === "income"));
const transfers = computed(() => bills.value.filter(b => b.type === "transfer"));

const tabs = computed(() => [
  { key: "expense", label: "Despesas", count: expenses.value.length },
  { key: "income", label: "Receitas", count: incomes.value.length },
  { key: "installment", label: "Parcelas", count: installments.value.length },
  { key: "transfer", label: "Aportes", count: transfers.value.length },
]);

const currentItems = computed(() => {
  if (activeTab.value === "expense") return expenses.value;
  if (activeTab.value === "income") return incomes.value;
  if (activeTab.value === "installment") return installments.value;
  return transfers.value;
});

const isIncomeLike = computed(() => activeTab.value === "income" || activeTab.value === "transfer");

const tabTotals = computed(() => {
  if (!billTotals.value) return { total: 0, paid: 0, pending: 0 };
  const map: Record<string, typeof billTotals.value.expenses> = {
    expense: billTotals.value.expenses,
    installment: billTotals.value.installments,
    income: billTotals.value.incomes,
    transfer: billTotals.value.transfers,
  };
  return map[activeTab.value] ?? { total: 0, paid: 0, pending: 0 };
});

function fmt(v: string | number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function installmentInfo(bill: Bill) {
  if (!bill.endDate) return null;
  const start = new Date(bill.startDate + "T00:00:00");
  const end = new Date(bill.endDate + "T00:00:00");
  const total = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  const current = (monthStore.year - start.getFullYear()) * 12 + (monthStore.month - 1 - start.getMonth()) + 1;
  return { current, total };
}

async function toggle(occurrenceId: number) {
  const bill = bills.value.find(b => b.occurrence?.id === occurrenceId);
  if (!bill?.occurrence) return;

  const prevPaid = bill.occurrence.paid;
  const nowPaid = !prevPaid;
  const amount = parseFloat(bill.amount);

  // Optimistic update — item
  bill.occurrence.paid = nowPaid;

  // Optimistic update — totais
  if (billTotals.value) {
    const key = bill.type === "income" ? "incomes" : bill.type === "transfer" ? "transfers" : bill.endDate ? "installments" : "expenses";
    const sec = billTotals.value[key];
    if (nowPaid) { sec.paid += amount; sec.pending -= amount; }
    else         { sec.paid -= amount; sec.pending += amount; }
  }

  try {
    await api.patch(`/bills/occurrences/${occurrenceId}/pay`);
  } catch {
    // Rollback
    bill.occurrence.paid = prevPaid;
    if (billTotals.value) {
      const key = bill.type === "income" ? "incomes" : bill.type === "transfer" ? "transfers" : bill.endDate ? "installments" : "expenses";
      const sec = billTotals.value[key];
      if (nowPaid) { sec.paid -= amount; sec.pending += amount; }
      else         { sec.paid += amount; sec.pending -= amount; }
    }
    error("Erro ao atualizar");
  }
}

async function remove(id: number) {
  try { await api.delete(`/bills/${id}`); await load(); success("Removido"); }
  catch { error("Erro ao remover"); }
}

function openNew() {
  editingId.value = null;
  form.value = { name: "", type: "expense", amount: "", startDate: new Date().toISOString().slice(0, 10), fromAccountId: "", toAccountId: "", frequency: "monthly", categoryId: "" };
  isInstallment.value = false;
  totalInstallments.value = 12;
  showDialog.value = true;
}

function openEdit(bill: Bill) {
  editingId.value = bill.id;
  const hasEnd = !!bill.endDate;
  let instCount = 12;
  if (hasEnd) {
    const s = new Date(bill.startDate + "T00:00:00");
    const e = new Date(bill.endDate! + "T00:00:00");
    instCount = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
  }
  form.value = {
    name: bill.name,
    type: bill.type,
    amount: bill.amount,
    startDate: bill.startDate,
    fromAccountId: bill.fromAccount ? String(bill.fromAccount.id) : "",
    toAccountId: bill.toAccount ? String(bill.toAccount.id) : "",
    frequency: bill.frequency,
    categoryId: bill.category ? String(bill.category.id) : "",
  };
  isInstallment.value = hasEnd;
  totalInstallments.value = instCount;
  showDialog.value = true;
}

function calcEndDate(start: string, total: number): string {
  const d = new Date(start + "T00:00:00");
  d.setMonth(d.getMonth() + total - 1);
  return d.toISOString().slice(0, 10);
}

async function submit() {
  if (!form.value.amount || !form.value.name.trim()) return;
  submitting.value = true;
  try {
    const endDate = isInstallment.value ? calcEndDate(form.value.startDate, totalInstallments.value) : null;
    const payload = {
      name: form.value.name, type: form.value.type,
      amount: parseFloat(form.value.amount), frequency: form.value.frequency,
      startDate: form.value.startDate, endDate,
      fromAccountId: form.value.fromAccountId ? parseInt(form.value.fromAccountId) : null,
      toAccountId: form.value.toAccountId ? parseInt(form.value.toAccountId) : null,
      categoryId: form.value.categoryId ? parseInt(form.value.categoryId) : null,
    };
    if (editingId.value) {
      await api.put(`/bills/${editingId.value}`, payload);
      success("Atualizado com sucesso");
    } else {
      await api.post("/bills", payload);
      success("Criado com sucesso");
    }
    showDialog.value = false;
    await load();
  } catch { error(editingId.value ? "Erro ao atualizar" : "Erro ao criar"); }
  finally { submitting.value = false; }
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

    <template v-if="loading">
      <Skeleton class="h-10 w-full mb-3" />
      <div class="grid grid-cols-3 gap-3 mb-4">
        <Skeleton class="h-16 rounded-xl" v-for="i in 3" :key="i" />
      </div>
      <Skeleton class="h-16 w-full mb-2" v-for="i in 3" :key="i" />
    </template>

    <template v-else>
      <Tabs :tabs="tabs" v-model="activeTab" />

      <!-- Totalizadores -->
      <div class="grid grid-cols-3 gap-3 mb-4 mt-3">
        <div class="rounded-xl border border-border bg-card px-4 py-3">
          <p class="text-xs text-muted-foreground mb-1">{{ isIncomeLike ? 'Previsto' : 'Comprometido' }}</p>
          <p class="text-sm font-bold" :class="isIncomeLike ? 'text-emerald-400' : 'text-rose-400'">{{ fmt(tabTotals.total) }}</p>
        </div>
        <div class="rounded-xl border border-border bg-card px-4 py-3">
          <p class="text-xs text-muted-foreground mb-1">{{ isIncomeLike ? 'Recebido' : 'Pago' }}</p>
          <p class="text-sm font-bold text-muted-foreground">{{ fmt(tabTotals.paid) }}</p>
        </div>
        <div class="rounded-xl border border-border bg-card px-4 py-3">
          <p class="text-xs text-muted-foreground mb-1">{{ isIncomeLike ? 'A receber' : 'A pagar' }}</p>
          <p class="text-sm font-bold" :class="tabTotals.pending > 0 ? (isIncomeLike ? 'text-emerald-400' : 'text-rose-400') : 'text-muted-foreground'">{{ fmt(tabTotals.pending) }}</p>
        </div>
      </div>

      <div v-if="!currentItems.length" class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted-foreground">
            <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        </div>
        <p class="text-sm text-muted-foreground">Nenhum item nesta aba</p>
      </div>

      <div v-else class="rounded-xl border border-border bg-card overflow-hidden">
        <div
          v-for="(bill, i) in currentItems"
          :key="bill.id"
          class="flex items-center gap-3 px-4 py-3 group"
          :class="{ 'border-t border-border': i > 0 }"
        >
          <!-- Check circle -->
          <button
            type="button"
            @click="bill.occurrence && toggle(bill.occurrence.id)"
            :disabled="!bill.occurrence"
            :class="[
              'w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
              bill.occurrence?.paid
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                : 'border-border hover:border-primary/50 text-transparent hover:text-muted-foreground'
            ]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <span
                v-if="bill.category"
                class="w-2 h-2 rounded-full flex-shrink-0 cursor-default"
                :style="{ background: bill.category.color ?? '#8b5cf6' }"
                @mouseenter="hoverCat = bill.id"
                @mouseleave="hoverCat = null"
                @click.stop="hoverCat = hoverCat === bill.id ? null : bill.id"
              />
              <p class="text-sm font-medium text-foreground truncate" :class="{ 'line-through text-muted-foreground': bill.occurrence?.paid }">
                {{ bill.name }}
              </p>
              <Badge v-if="installmentInfo(bill)" variant="muted" class="text-[10px]">
                {{ installmentInfo(bill)!.current }}/{{ installmentInfo(bill)!.total }}
              </Badge>
            </div>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span v-if="bill.fromAccount" class="text-xs text-muted-foreground">{{ bill.fromAccount.name }}</span>
              <span v-if="bill.fromAccount && bill.toAccount" class="text-xs text-muted-foreground">→</span>
              <span v-if="bill.toAccount" class="text-xs text-muted-foreground">{{ bill.toAccount.name }}</span>
              <span v-if="bill.occurrence" class="text-xs text-muted-foreground">venc. {{ fmtDate(bill.occurrence.dueDate) }}</span>
            </div>
            <p v-if="bill.category && hoverCat === bill.id" class="text-xs mt-0.5 uppercase tracking-wide" :style="{ color: bill.category.color ?? '#8b5cf6' }">{{ bill.category.name }}</p>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold" :class="bill.type === 'income' ? 'text-emerald-400' : bill.type === 'transfer' ? 'text-blue-400' : 'text-rose-400'">
              {{ fmt(bill.amount) }}
            </span>
            <button type="button" @click="openEdit(bill)"
              class="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button type="button" @click="remove(bill.id)"
              class="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Dialog -->
    <Dialog :open="showDialog" :title="editingId ? 'Editar recorrente' : 'Novo recorrente'" @update:open="showDialog = $event">
      <!-- Type toggle -->
      <div class="flex gap-1.5 mb-4 p-1 bg-secondary rounded-lg">
        <button v-for="[v,l] in [['expense','Despesa'],['income','Receita'],['transfer','Aporte']]" :key="v" type="button"
          @click="form.type = v as typeof form.type"
          :class="['flex-1 h-8 rounded-md text-xs font-medium transition-all', form.type === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground']">
          {{ l }}
        </button>
      </div>
      <div class="space-y-3">
        <div><label class="text-xs text-muted-foreground block mb-1">Nome</label>
          <input v-model="form.name" :class="inputClass" placeholder="Ex: Aluguel, Salário..." autofocus />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div><label class="text-xs text-muted-foreground block mb-1">Valor</label>
            <input v-model="form.amount" :class="inputClass" type="number" step="0.01" placeholder="0,00" />
          </div>
          <div><label class="text-xs text-muted-foreground block mb-1">Início</label>
            <input v-model="form.startDate" :class="inputClass" type="date" />
          </div>
        </div>
        <div v-if="form.type !== 'income'">
          <label class="text-xs text-muted-foreground block mb-1">{{ form.type === 'transfer' ? 'Débitar de' : 'Conta (opcional)' }}</label>
          <select v-model="form.fromAccountId" :class="selectClass">
            <option value="">Não especificar</option>
            <option v-for="a in accountsStore.accounts.filter(a => ['checking','savings','cash','credit_card'].includes(a.type))" :key="a.id" :value="String(a.id)">{{ a.name }}</option>
          </select>
        </div>
        <div v-if="form.type !== 'expense'">
          <label class="text-xs text-muted-foreground block mb-1">{{ form.type === 'transfer' ? 'Destino' : 'Conta (opcional)' }}</label>
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
        <div v-if="form.type === 'expense'" class="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2.5">
          <label class="text-sm text-foreground cursor-pointer" @click="isInstallment = !isInstallment">É parcelado?</label>
          <button type="button" @click="isInstallment = !isInstallment"
            :class="['relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors', isInstallment ? 'bg-primary' : 'bg-muted']">
            <span :class="['pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform', isInstallment ? 'translate-x-4' : 'translate-x-0']" />
          </button>
        </div>
        <div v-if="isInstallment">
          <label class="text-xs text-muted-foreground block mb-1">Total de parcelas</label>
          <input v-model.number="totalInstallments" :class="inputClass" type="number" min="2" max="120" />
        </div>
        <div class="flex gap-2 pt-1">
          <button type="button" @click="showDialog = false"
            class="flex-1 h-9 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors">Cancelar</button>
          <button type="button" @click="submit" :disabled="submitting || !form.amount || !form.name"
            class="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <svg v-if="submitting" class="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Criar
          </button>
        </div>
      </div>
    </Dialog>
  </div>
</template>
