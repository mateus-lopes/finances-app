<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useAccountsStore } from "../stores/accounts";
import { useToast } from "../composables/useToast";
import api from "../services/api";
import Dialog from "./ui/Dialog.vue";

const props = withDefaults(defineProps<{ initialType?: "income" | "expense" | "transfer" }>(), { initialType: "expense" });
const emit = defineEmits<{ close: [] }>();
const { success, error } = useToast();
const accountsStore = useAccountsStore();

const submitting = ref(false);
const form = ref({
  type: props.initialType as "income" | "expense" | "transfer",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  description: "",
  fromAccountId: "" as string,
  toAccountId: "" as string,
});

onMounted(() => accountsStore.loadAccounts());

const typeOptions = [
  { value: "expense", label: "Despesa", color: "text-rose-400" },
  { value: "income", label: "Receita", color: "text-emerald-400" },
  { value: "transfer", label: "Transferência", color: "text-blue-400" },
];

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
    });
    success("Transação criada!");
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
  <Dialog :open="true" title="Lançar transação" @update:open="(v) => !v && emit('close')">
    <!-- Type toggle -->
    <div class="flex gap-1.5 mb-5 p-1 bg-secondary rounded-lg">
      <button
        v-for="opt in typeOptions"
        :key="opt.value"
        type="button"
        @click="form.type = opt.value as typeof form.type"
        :class="[
          'flex-1 h-8 rounded-md text-xs font-medium transition-all',
          form.type === opt.value
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        ]"
      >
        {{ opt.label }}
      </button>
    </div>

    <div class="space-y-4">
      <div>
        <label class="text-xs font-medium text-muted-foreground block mb-1.5">Descrição</label>
        <input v-model="form.description" :class="inputClass" placeholder="Ex: Almoço, Salário..." autofocus />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-muted-foreground block mb-1.5">Valor (R$)</label>
          <input v-model="form.amount" :class="inputClass" type="number" step="0.01" min="0" placeholder="0,00" />
        </div>
        <div>
          <label class="text-xs font-medium text-muted-foreground block mb-1.5">Data</label>
          <input v-model="form.date" :class="inputClass" type="date" />
        </div>
      </div>

      <div v-if="form.type === 'expense' || form.type === 'transfer'">
        <label class="text-xs font-medium text-muted-foreground block mb-1.5">
          {{ form.type === 'transfer' ? 'De' : 'Conta de débito' }}
        </label>
        <select v-model="form.fromAccountId" :class="selectClass">
          <option value="" disabled>Selecione a conta</option>
          <option
            v-for="acc in accountsStore.accounts.filter(a => ['checking','savings','cash','credit_card'].includes(a.type))"
            :key="acc.id" :value="String(acc.id)"
          >{{ acc.name }}</option>
        </select>
      </div>

      <div v-if="form.type === 'income' || form.type === 'transfer'">
        <label class="text-xs font-medium text-muted-foreground block mb-1.5">
          {{ form.type === 'transfer' ? 'Para' : 'Conta de crédito' }}
        </label>
        <select v-model="form.toAccountId" :class="selectClass">
          <option value="" disabled>Selecione a conta</option>
          <option
            v-for="acc in accountsStore.accounts.filter(a => ['checking','savings','cash','investment'].includes(a.type))"
            :key="acc.id" :value="String(acc.id)"
          >{{ acc.name }}</option>
        </select>
      </div>

      <div class="flex gap-2 pt-1">
        <button
          type="button"
          @click="emit('close')"
          class="flex-1 h-10 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >Cancelar</button>
        <button
          type="button"
          @click="submit"
          :disabled="submitting || !form.amount || !form.description || (form.type === 'expense' && !form.fromAccountId) || (form.type === 'income' && !form.toAccountId) || (form.type === 'transfer' && (!form.fromAccountId || !form.toAccountId))"
          class="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg v-if="submitting" class="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Salvar
        </button>
      </div>
    </div>
  </Dialog>
</template>
