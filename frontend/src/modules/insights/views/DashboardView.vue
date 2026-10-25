<script setup lang="ts">
import { ref } from "vue";
import { useDashboard } from "../composables/useDashboard";
import { useToast } from "@/shared/composables/useToast";
import MonthNavigator from "@/shared/components/MonthNavigator.vue";
import Skeleton from "@/shared/ui/Skeleton.vue";
import Badge from "@/shared/ui/Badge.vue";
import Progress from "@/shared/ui/Progress.vue";
import { accountsApi } from "@/modules/ledger";
import { billsApi } from "@/modules/planning";

const { data, loading, load } = useDashboard();
const hoverCat = ref<number | null>(null);
const { error } = useToast();

function fmt(value: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
}

function fmtShort(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  if (Math.abs(n) >= 1000) return `R$${(n / 1000).toFixed(1)}k`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
}

const pct = (current: number | null, goal: number | null) =>
  goal && goal > 0 ? Math.min(100, ((current ?? 0) / goal) * 100) : 0;

async function toggleInvoice(accountId: number, month: number, year: number) {
  try {
    await accountsApi.toggleInvoicePaid(accountId, { month, year });
    await load();
  } catch { error("Erro ao atualizar fatura"); }
}

async function toggleOccurrence(occurrenceId: number) {
  try {
    await billsApi.toggleOccurrencePaid(occurrenceId);
    await load();
  } catch { error("Erro ao atualizar pendência"); }
}
</script>

<template>
  <div class="page">
    <!-- Header -->
    <div class="flex items-center justify-between mb-5 lg:hidden">
      <MonthNavigator />
    </div>

    <!-- Skeleton -->
    <template v-if="loading">
      <Skeleton class="h-36 w-full mb-3" />
      <Skeleton class="h-20 w-full mb-3" />
      <Skeleton class="h-20 w-full mb-3" />
    </template>

    <template v-else-if="data">
      <!-- Saldo card -->
      <div class="rounded-2xl p-5 mb-4 relative overflow-hidden"
        :class="data.saldo >= 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'">
        <div class="absolute inset-0 opacity-5"
          :style="{ background: data.saldo >= 0 ? 'radial-gradient(circle at 80% 50%, #10b981 0%, transparent 60%)' : 'radial-gradient(circle at 80% 50%, #ef4444 0%, transparent 60%)' }" />
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Saldo do mês</p>
        <p class="text-3xl font-bold mb-3" :class="data.saldo >= 0 ? 'text-emerald-400' : 'text-rose-400'">
          {{ fmt(data.saldo) }}
        </p>
        <div class="flex gap-4 flex-wrap">
          <div>
            <p class="text-xs text-muted-foreground">Receitas</p>
            <p class="text-sm font-semibold text-emerald-400">+{{ fmtShort(data.totalIncome) }}</p>
          </div>
          <div class="w-px bg-white/10" />
          <div>
            <p class="text-xs text-muted-foreground">Despesas</p>
            <p class="text-sm font-semibold text-rose-400">-{{ fmtShort(data.totalExpenses) }}</p>
          </div>
          <template v-if="(data.invested ?? 0) > 0">
            <div class="w-px bg-white/10" />
            <div>
              <p class="text-xs text-muted-foreground">Investido</p>
              <p class="text-sm font-semibold text-violet-400">↗{{ fmtShort(data.invested) }}</p>
            </div>
          </template>
        </div>
      </div>

      <!-- Saldo Real -->
      <div class="rounded-2xl p-4 mb-4 border border-border bg-card flex items-center justify-between">
        <div>
          <p class="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Saldo Real</p>
          <p class="text-lg font-bold" :class="data.realBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'">
            {{ fmt(data.realBalance) }}
          </p>
          <p class="text-xs text-muted-foreground mt-0.5">Acumulado de todas as contas reais</p>
        </div>
        <div class="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="text-muted-foreground">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
      </div>

      <!-- Pendências -->
      <template v-if="data.pending.length > 0">
        <p class="section-label mb-2">Pendências ({{ data.pending.length }})</p>
        <div class="rounded-xl border border-border bg-card overflow-hidden mb-4">
          <button
            v-for="(item, i) in data.pending"
            :key="item.id"
            type="button"
            @click="toggleOccurrence(item.id)"
            class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 active:bg-secondary transition-colors group"
            :class="{ 'border-t border-border': i > 0 }"
          >
            <div class="flex-shrink-0 w-8 h-8 rounded-full border-2 border-border group-hover:border-primary/50 transition-colors flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-muted-foreground">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5">
                <span
                  v-if="item.category"
                  class="w-2 h-2 rounded-full flex-shrink-0 cursor-default"
                  :style="{ background: item.category.color ?? '#8b5cf6' }"
                  @mouseenter="hoverCat = item.id"
                  @mouseleave="hoverCat = null"
                  @click.stop="hoverCat = hoverCat === item.id ? null : item.id"
                />
                <p class="text-sm font-medium text-foreground truncate">{{ item.name }}</p>
              </div>
              <p class="text-xs text-muted-foreground mt-0.5">vence {{ new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) }}</p>
              <p v-if="item.category && hoverCat === item.id" class="text-xs mt-0.5 uppercase tracking-wide" :style="{ color: item.category.color ?? '#8b5cf6' }">{{ item.category.name }}</p>
            </div>
            <span class="text-sm font-semibold" :class="item.type === 'income' ? 'text-emerald-400' : 'text-rose-400'">
              {{ item.type === 'income' ? '+' : '-' }}{{ fmtShort(item.amount) }}
            </span>
          </button>
        </div>
      </template>

      <!-- Confirmadas -->
      <template v-if="data.confirmed?.length > 0">
        <p class="section-label mb-2">Confirmadas ({{ data.confirmed.length }})</p>
        <div class="rounded-xl border border-border bg-card overflow-hidden mb-4">
          <div
            v-for="(item, i) in data.confirmed"
            :key="item.id"
            class="flex items-center gap-3 px-4 py-3"
            :class="{ 'border-t border-border': i > 0 }"
          >
            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5">
                <span v-if="item.category" class="w-2 h-2 rounded-full flex-shrink-0" :style="{ background: item.category.color ?? '#8b5cf6' }" />
                <p class="text-sm font-medium text-muted-foreground truncate">{{ item.name }}</p>
              </div>
              <p class="text-xs text-muted-foreground/50 mt-0.5">vence {{ new Date(item.dueDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) }}</p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <span class="text-sm text-muted-foreground">{{ fmtShort(item.amount) }}</span>
              <span class="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">pago</span>
            </div>
          </div>
        </div>
      </template>

      <!-- Faturas de cartão -->
      <template v-if="data.creditCards.length > 0">
        <p class="section-label mb-2">Faturas de cartão</p>
        <div class="rounded-xl border border-border bg-card overflow-hidden mb-4">
          <button
            v-for="(card, i) in data.creditCards"
            :key="card.account.id"
            type="button"
            @click="toggleInvoice(card.account.id, card.month, card.year)"
            class="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 active:bg-secondary transition-colors"
            :class="{ 'border-t border-border': i > 0 }"
          >
            <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              :style="{ background: (card.account.color ?? '#8b5cf6') + '20', color: card.account.color ?? '#8b5cf6' }">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0 text-left">
              <p class="text-sm font-medium text-foreground">{{ card.account.name }}</p>
              <p class="text-xs text-muted-foreground">Fatura do mês</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-rose-400">{{ fmtShort(card.amount) }}</span>
              <Badge :variant="card.paid ? 'success' : 'warning'">{{ card.paid ? 'Pago' : 'Aberto' }}</Badge>
            </div>
          </button>
        </div>
      </template>

      <!-- Investimentos -->
      <template v-if="data.investments.length > 0">
        <p class="section-label mb-2">Investimentos</p>
        <div class="rounded-xl border border-border bg-card overflow-hidden mb-4">
          <div
            v-for="(inv, i) in data.investments"
            :key="inv.id"
            class="px-4 py-3"
            :class="{ 'border-t border-border': i > 0 }"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-foreground">{{ inv.name }}</p>
                <p class="text-xs text-muted-foreground">{{ fmt(inv.currentAmount) }} acumulado</p>
              </div>
              <div class="flex items-center gap-2">
                <span v-if="inv.monthlyAmount" class="text-xs text-muted-foreground">+{{ fmtShort(inv.monthlyAmount) }}/mês</span>
                <Badge :variant="inv.paid ? 'success' : 'muted'">{{ inv.paid ? 'Aportado' : 'Pendente' }}</Badge>
              </div>
            </div>
            <template v-if="inv.showProgress && inv.targetAmount">
              <Progress :value="pct(inv.currentAmount, inv.targetAmount)" class="mt-3" color="#34d399" />
              <div class="flex justify-between mt-1">
                <span class="text-xs text-muted-foreground">{{ fmtShort(inv.currentAmount) }}</span>
                <span class="text-xs text-muted-foreground">Meta: {{ fmtShort(inv.targetAmount) }}</span>
              </div>
            </template>
          </div>
        </div>
      </template>

      <!-- Estado vazio -->
      <div v-if="!data.pending.length && !data.confirmed?.length && !data.creditCards.length && !data.investments.length"
        class="flex flex-col items-center justify-center py-16 text-center">
        <div class="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted-foreground">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
          </svg>
        </div>
        <p class="text-sm text-muted-foreground">Nenhuma atividade neste mês</p>
        <p class="text-xs text-muted-foreground/60 mt-1">Use o + para lançar sua primeira transação</p>
      </div>
    </template>
  </div>
</template>
