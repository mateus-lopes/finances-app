<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAccountsStore } from "../stores/accounts";
import { useToast } from "../composables/useToast";
import api from "../services/api";

const accountsStore = useAccountsStore();
const { success, error } = useToast();

type Step = "upload" | "preview" | "done";
const step = ref<Step>("upload");
const loading = ref(false);
const dragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const imported = ref(0);
const accountId = ref("");

interface Category {
  id: number;
  name: string;
  color: string | null;
}

interface PreviewItem {
  fitid: string;
  date: string;
  amount: number;
  type: "income" | "expense" | "transfer";
  description: string;
  duplicate: boolean;
  suggestedCategoryId: number | null;
  categoryId: number | null;
  toAccountId: number | null;
  include: boolean;
}

const items = ref<PreviewItem[]>([]);
const allCategories = ref<Category[]>([]);

const liquidAccounts = computed(() =>
  accountsStore.accounts.filter(a => ["checking", "savings", "cash"].includes(a.type))
);

const selectedCount = computed(() => items.value.filter(i => i.include).length);
const duplicateCount = computed(() => items.value.filter(i => i.duplicate).length);
const categorizedCount = computed(() => items.value.filter(i => i.include && i.categoryId).length);

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
function categoryColor(id: number | null): string {
  if (!id) return "#6b7280";
  return allCategories.value.find(c => c.id === id)?.color ?? "#6b7280";
}

async function loadCategories() {
  try {
    const { data } = await api.get("/categories");
    allCategories.value = data;
  } catch { /* silencioso */ }
}

onMounted(loadCategories);

function readFile(file: File) {
  if (!file.name.toLowerCase().endsWith(".ofx")) {
    error("Selecione um arquivo .ofx");
    return;
  }
  const reader = new FileReader();
  reader.onload = async (e) => {
    const content = e.target?.result as string;
    await sendPreview(content);
  };
  reader.readAsText(file, "windows-1252");
}

async function sendPreview(content: string) {
  loading.value = true;
  try {
    await accountsStore.loadAccounts();
    await loadCategories();
    const { data } = await api.post("/import/ofx/preview", { content });
    items.value = data.items.map((i: PreviewItem) => ({
      ...i,
      categoryId: i.suggestedCategoryId ?? null,
      toAccountId: null,
      include: !i.duplicate,
    }));
    step.value = "preview";
  } catch { error("Erro ao processar o arquivo. Verifique se é um OFX válido."); }
  finally { loading.value = false; }
}

function handleDrop(e: DragEvent) {
  dragging.value = false;
  const file = e.dataTransfer?.files[0];
  if (file) readFile(file);
}

function handleFileInput(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) readFile(file);
}

function toggleAll(val: boolean) {
  items.value.forEach(i => { i.include = val; });
}

async function confirm() {
  const toImport = items.value.filter(i => i.include);
  if (!toImport.length) { error("Nenhuma transação selecionada."); return; }
  loading.value = true;
  try {
    const { data } = await api.post("/import/ofx/confirm", {
      accountId: accountId.value ? parseInt(accountId.value) : null,
      items: toImport.map(({ fitid, date, amount, type, description, categoryId, toAccountId }) => ({
        fitid, date, amount, type, description, categoryId,
        toAccountId: type === "transfer" ? toAccountId : undefined,
      })),
    });
    imported.value = data.imported;
    step.value = "done";
    success(`${data.imported} transações importadas`);
  } catch { error("Erro ao importar transações."); }
  finally { loading.value = false; }
}

function reset() {
  step.value = "upload";
  items.value = [];
  accountId.value = "";
  if (fileInput.value) fileInput.value.value = "";
}
</script>

<template>
  <div class="page max-w-2xl mx-auto">
    <p class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">Importar extrato OFX</p>

    <!-- ── STEP 1: UPLOAD ─────────────────────────────────────────────── -->
    <template v-if="step === 'upload'">
      <div
        class="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors select-none"
        :class="dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-secondary/30'"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="handleDrop"
        @click="fileInput?.click()"
      >
        <input ref="fileInput" type="file" accept=".ofx" class="hidden" @change="handleFileInput" />

        <div v-if="loading" class="flex flex-col items-center gap-3">
          <svg class="animate-spin w-10 h-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <p class="text-sm text-muted-foreground">Processando arquivo...</p>
        </div>

        <div v-else class="flex flex-col items-center gap-3">
          <div class="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted-foreground">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-foreground">Arraste o arquivo .ofx aqui</p>
            <p class="text-xs text-muted-foreground mt-1">ou clique para selecionar</p>
          </div>
        </div>
      </div>

      <div class="mt-5 rounded-xl border border-border bg-card p-4 space-y-2">
        <p class="text-xs font-semibold text-foreground">Como exportar do Banco do Brasil</p>
        <ol class="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Acesse o Internet Banking do BB</li>
          <li>Vá em <span class="text-foreground font-medium">Conta Corrente → Extrato</span></li>
          <li>Selecione o período desejado</li>
          <li>Clique em <span class="text-foreground font-medium">Exportar → Gerenciador Financeiro (.ofx)</span></li>
        </ol>
      </div>
    </template>

    <!-- ── STEP 2: PREVIEW ───────────────────────────────────────────── -->
    <template v-else-if="step === 'preview'">
      <!-- Resumo -->
      <div class="grid grid-cols-4 gap-3 mb-4">
        <div class="rounded-xl border border-border bg-card px-3 py-3">
          <p class="text-[10px] text-muted-foreground mb-1">Encontradas</p>
          <p class="text-lg font-bold text-foreground">{{ items.length }}</p>
        </div>
        <div class="rounded-xl border border-border bg-card px-3 py-3">
          <p class="text-[10px] text-muted-foreground mb-1">Selecionadas</p>
          <p class="text-lg font-bold text-primary">{{ selectedCount }}</p>
        </div>
        <div class="rounded-xl border border-border bg-card px-3 py-3">
          <p class="text-[10px] text-muted-foreground mb-1">Categorizadas</p>
          <p class="text-lg font-bold text-emerald-400">{{ categorizedCount }}</p>
        </div>
        <div class="rounded-xl border border-border bg-card px-3 py-3">
          <p class="text-[10px] text-muted-foreground mb-1">Duplicadas</p>
          <p class="text-lg font-bold text-amber-400">{{ duplicateCount }}</p>
        </div>
      </div>

      <!-- Conta de destino -->
      <div class="mb-4">
        <label class="text-xs text-muted-foreground block mb-1.5">Conta de destino (opcional)</label>
        <select
          v-model="accountId"
          class="flex h-9 w-full rounded-lg border border-input bg-secondary/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
        >
          <option value="">Não vincular conta</option>
          <option v-for="a in liquidAccounts" :key="a.id" :value="String(a.id)">{{ a.name }}</option>
        </select>
      </div>

      <!-- Ações de seleção -->
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-muted-foreground">Desmarque o que não quer importar</p>
        <div class="flex gap-2">
          <button type="button" @click="toggleAll(true)" class="text-xs text-primary hover:underline">Marcar todas</button>
          <span class="text-muted-foreground text-xs">·</span>
          <button type="button" @click="toggleAll(false)" class="text-xs text-muted-foreground hover:text-foreground hover:underline">Desmarcar todas</button>
        </div>
      </div>

      <!-- Lista -->
      <div class="rounded-xl border border-border bg-card overflow-hidden mb-4">
        <div
          v-for="(item, i) in items"
          :key="item.fitid || i"
          class="flex items-start gap-3 px-4 py-3 transition-colors"
          :class="[
            { 'border-t border-border': i > 0 },
            !item.include ? 'opacity-40' : '',
          ]"
        >
          <!-- Checkbox -->
          <input
            type="checkbox"
            v-model="item.include"
            class="w-4 h-4 mt-0.5 rounded border-border accent-primary cursor-pointer flex-shrink-0"
          />

          <!-- Descrição + data + categoria -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span
                class="w-2 h-2 rounded-full flex-shrink-0"
                :style="{ backgroundColor: item.type === 'transfer' ? '#a78bfa' : categoryColor(item.categoryId) }"
              />
              <p class="text-sm font-medium text-foreground truncate">{{ item.description }}</p>
              <span v-if="item.duplicate" class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 flex-shrink-0">duplicada</span>
              <span v-if="item.type === 'transfer'" class="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25 flex-shrink-0">transferência</span>
              <span v-else-if="item.suggestedCategoryId && item.categoryId === item.suggestedCategoryId" class="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex-shrink-0">auto</span>
            </div>
            <p class="text-xs text-muted-foreground mt-0.5 mb-1.5">{{ fmtDate(item.date) }}</p>

            <!-- Conta destino (só transferência) -->
            <select
              v-if="item.type === 'transfer'"
              v-model="item.toAccountId"
              class="h-7 w-full max-w-[200px] rounded-md border border-violet-500/40 bg-violet-500/10 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500 appearance-none cursor-pointer mb-1.5"
            >
              <option :value="null">→ Conta destino</option>
              <option v-for="a in liquidAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
            </select>

            <!-- Select de categoria (não transferência) -->
            <select
              v-else
              v-model="item.categoryId"
              class="h-7 w-full max-w-[200px] rounded-md border border-input bg-secondary/60 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer"
            >
              <option :value="null">Sem categoria</option>
              <option v-for="c in allCategories" :key="c.id" :value="c.id">{{ c.name.toUpperCase() }}</option>
            </select>
          </div>

          <!-- Valor -->
          <span class="text-sm font-semibold tabular-nums flex-shrink-0 mt-0.5"
            :class="item.type === 'income' ? 'text-emerald-400' : item.type === 'transfer' ? 'text-violet-400' : 'text-rose-400'">
            {{ item.type === 'income' ? '+' : item.type === 'transfer' ? '⇄' : '-' }}{{ fmt(item.amount) }}
          </span>
        </div>
      </div>

      <!-- Botões -->
      <div class="flex gap-2">
        <button type="button" @click="reset"
          class="flex-1 h-10 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors">
          Cancelar
        </button>
        <button type="button" @click="confirm" :disabled="loading || !selectedCount"
          class="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          <svg v-if="loading" class="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Importar {{ selectedCount }} transações
        </button>
      </div>
    </template>

    <!-- ── STEP 3: DONE ───────────────────────────────────────────────── -->
    <template v-else-if="step === 'done'">
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <p class="text-lg font-bold text-foreground">{{ imported }} transações importadas</p>
        <p class="text-sm text-muted-foreground mt-1">Elas já aparecem na tela de Transações</p>
        <button type="button" @click="reset"
          class="mt-6 h-10 px-6 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors">
          Importar outro arquivo
        </button>
      </div>
    </template>
  </div>
</template>
