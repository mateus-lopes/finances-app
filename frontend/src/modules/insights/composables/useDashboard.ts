import { ref, watch } from "vue";
import { useMonthStore } from "@/shared/stores/month";
import { insightsApi } from "../api";
import type { DashboardData } from "../types";

export function useDashboard() {
  const monthStore = useMonthStore();
  const data = ref<DashboardData | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      data.value = await insightsApi.getDashboard(monthStore.period);
    } catch {
      error.value = "Erro ao carregar dados";
    } finally {
      loading.value = false;
    }
  }

  watch(() => monthStore.period, load, { immediate: true });

  return { data, loading, error, load };
}
