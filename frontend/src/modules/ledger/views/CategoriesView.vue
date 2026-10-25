<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useToast } from "@/shared/composables/useToast";
import Skeleton from "@/shared/ui/Skeleton.vue";
import Dialog from "@/shared/ui/Dialog.vue";
import { categoriesApi } from "../api";
import type { Category } from "../types";

const { success, error } = useToast();

const categories = ref<Category[]>([]);
const loading = ref(false);
const showDialog = ref(false);
const saving = ref(false);
const form = ref({ name: "", color: "#8b5cf6" });

const inputClass = "flex h-9 w-full rounded-lg border border-input bg-secondary/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

async function load() {
  loading.value = true;
  try {
    categories.value = await categoriesApi.list();
  } finally { loading.value = false; }
}

async function save() {
  if (!form.value.name.trim()) return;
  saving.value = true;
  try {
    await categoriesApi.create(form.value);
    form.value = { name: "", color: "#8b5cf6" };
    showDialog.value = false;
    await load();
    success("Categoria criada");
  } catch { error("Erro ao criar categoria"); }
  finally { saving.value = false; }
}

async function remove(id: number) {
  try { await categoriesApi.remove(id); await load(); }
  catch { error("Erro ao remover"); }
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="flex items-center justify-between mb-5">
      <h1 class="text-lg font-bold text-foreground">Categorias</h1>
      <button type="button" @click="showDialog = true"
        class="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>

    <template v-if="loading">
      <Skeleton class="h-12 w-full mb-2" v-for="i in 4" :key="i" />
    </template>

    <div v-else-if="!categories.length" class="flex flex-col items-center justify-center py-16 text-center">
      <div class="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted-foreground">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
        </svg>
      </div>
      <p class="text-sm text-muted-foreground">Nenhuma categoria criada</p>
    </div>

    <div v-else class="rounded-xl border border-border bg-card overflow-hidden">
      <div v-for="(cat, i) in categories" :key="cat.id"
        class="flex items-center gap-3 px-4 py-3 group"
        :class="{ 'border-t border-border': i > 0 }">
        <span class="w-3 h-3 rounded-full flex-shrink-0" :style="{ background: cat.color ?? '#8b5cf6' }" />
        <span class="flex-1 text-sm font-medium text-foreground">{{ cat.name }}</span>
        <button type="button" @click="remove(cat.id)"
          class="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </button>
      </div>
    </div>

    <Dialog :open="showDialog" title="Nova categoria" @update:open="showDialog = $event">
      <div class="space-y-3">
        <div><label class="text-xs text-muted-foreground block mb-1">Nome</label>
          <input v-model="form.name" :class="inputClass" placeholder="Ex: Alimentação..." autofocus />
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs text-muted-foreground">Cor</span>
          <input type="color" v-model="form.color" class="h-9 w-16 rounded-lg border border-input cursor-pointer bg-secondary/60" />
          <span class="w-4 h-4 rounded-full" :style="{ background: form.color }" />
        </div>
        <div class="flex gap-2 pt-1">
          <button type="button" @click="showDialog = false" class="flex-1 h-9 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors">Cancelar</button>
          <button type="button" @click="save" :disabled="saving || !form.name" class="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            <svg v-if="saving" class="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Criar
          </button>
        </div>
      </div>
    </Dialog>
  </div>
</template>
