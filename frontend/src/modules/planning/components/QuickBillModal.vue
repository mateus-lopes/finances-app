<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useAccountsStore } from "@/modules/ledger";
import { useToast } from "@/shared/composables/useToast";
import { billsApi } from "../api";
import type { BillInput } from "../types";
import Dialog from "@/shared/ui/Dialog.vue";

const emit = defineEmits<{ close: [] }>();
const { success, error } = useToast();
const accountsStore = useAccountsStore();

onMounted(() => accountsStore.loadAccounts());

const submitting = ref(false);
const isInstallment = ref(false);

const form = ref({
  type: "expense" as "income" | "expense" | "transfer",
  name: "",
  amount: "",
  startDate: new Date().toISOString().slice(0, 10),
  fromAccountId: "",
  toAccountId: "",
  totalInstallments: "12",
});

const typeOptions = [
  { value: "expense",  label: "Despesa" },
  { value: "income",   label: "Receita" },
  { value: "transfer", label: "Aporte"  },
];

function calcEndDate(start: string, months: number): string {
  const d = new Date(start + "T00:00:00");
  d.setMonth(d.getMonth() + months - 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return last.toISOString().slice(0, 10);
}

async function submit() {
  if (!form.value.amount || !form.value.name.trim()) return;
  submitting.value = true;
  try {
    const payload: BillInput = {
      type: form.value.type,
      name: form.value.name.trim(),
      amount: parseFloat(form.value.amount),
      startDate: form.value.startDate,
      frequency: "monthly",
      fromAccountId: form.value.fromAccountId ? parseInt(form.value.fromAccountId) : null,
      toAccountId: form.value.toAccountId ? parseInt(form.value.toAccountId) : null,
    };
    if (isInstallment.value && form.value.type === "expense") {
      payload.endDate = calcEndDate(form.value.startDate, parseInt(form.value.totalInstallments) || 1);
    }
    await billsApi.create(payload);
    success("Recorrente criado!");
    emit("close");
  } catch {
    error("Erro ao salvar", "Tente novamente.");
  } finally {
    submitting.value = false;
  }
}

const inputClass = "flex h-10 w-full rounded-lg border border-input bg-secondary/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";
const selectClass = "flex h-10 w-full rounded-lg border border-input bg-secondary/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer";
</script>

<template>
  <Dialog :open="true" title="Novo recorrente" @update:open="(v) => !v && emit('close')">
    <!-- Tipo -->
    <div class="flex gap-1.5 mb-5 p-1 bg-secondary rounded-lg">
      <button
        v-for="opt in typeOptions"
        :key="opt.value"
        type="button"
        @click="form.type = opt.value as typeof form.type; isInstallment = false"
        :class="[
          'flex-1 h-8 rounded-md text-xs font-medium transition-all',
          form.type === opt.value
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        ]"
      >{{ opt.label }}</button>
    </div>

    <div class="space-y-4">
      <!-- Nome -->
      <div>
        <label class="text-xs font-medium text-muted-foreground block mb-1.5">Nome</label>
        <input v-model="form.name" :class="inputClass" placeholder="Ex: Aluguel, Salário..." autofocus />
      </div>

      <!-- Valor + Data início -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-muted-foreground block mb-1.5">Valor (R$)</label>
          <input v-model="form.amount" :class="inputClass" type="number" step="0.01" min="0" placeholder="0,00" />
        </div>
        <div>
          <label class="text-xs font-medium text-muted-foreground block mb-1.5">Início</label>
          <input v-model="form.startDate" :class="inputClass" type="date" />
        </div>
      </div>

      <!-- Conta de débito -->
      <div v-if="form.type === 'expense' || form.type === 'transfer'">
        <label class="text-xs font-medium text-muted-foreground block mb-1.5">
          {{ form.type === 'transfer' ? 'Débitar de' : 'Conta (opcional)' }}
        </label>
        <select v-model="form.fromAccountId" :class="selectClass">
          <option value="">Não especificar</option>
          <option
            v-for="acc in accountsStore.accounts.filter(a => ['checking','savings','cash','credit_card'].includes(a.type))"
            :key="acc.id" :value="String(acc.id)"
          >{{ acc.name }}</option>
        </select>
      </div>

      <!-- Conta de crédito / destino -->
      <div v-if="form.type === 'income' || form.type === 'transfer'">
        <label class="text-xs font-medium text-muted-foreground block mb-1.5">
          {{ form.type === 'transfer' ? 'Destino' : 'Conta (opcional)' }}
        </label>
        <select v-model="form.toAccountId" :class="selectClass">
          <option value="">Não especificar</option>
          <option
            v-for="acc in accountsStore.accounts.filter(a => ['checking','savings','cash','investment'].includes(a.type))"
            :key="acc.id" :value="String(acc.id)"
          >{{ acc.name }}</option>
        </select>
      </div>

      <!-- Toggle parcelado (só para despesa) -->
      <div v-if="form.type === 'expense'" class="flex items-center justify-between py-1">
        <span class="text-xs font-medium text-muted-foreground">É parcelado?</span>
        <button
          type="button"
          @click="isInstallment = !isInstallment"
          :class="[
            'w-10 h-6 rounded-full transition-colors relative',
            isInstallment ? 'bg-primary' : 'bg-secondary border border-border'
          ]"
        >
          <span
            class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
            :class="isInstallment ? 'translate-x-4' : ''"
          />
        </button>
      </div>

      <!-- Número de parcelas -->
      <div v-if="isInstallment && form.type === 'expense'">
        <label class="text-xs font-medium text-muted-foreground block mb-1.5">Total de parcelas</label>
        <input v-model="form.totalInstallments" :class="inputClass" type="number" min="2" max="120" placeholder="Ex: 12" />
      </div>

      <!-- Botões -->
      <div class="flex gap-2 pt-1">
        <button
          type="button"
          @click="emit('close')"
          class="flex-1 h-10 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >Cancelar</button>
        <button
          type="button"
          @click="submit"
          :disabled="submitting || !form.amount || !form.name"
          class="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg v-if="submitting" class="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Criar
        </button>
      </div>
    </div>
  </Dialog>
</template>
