import { ref } from "vue";
import type { Period } from "@/shared/types";
import { insightsApi } from "../api";
import type { AiAnalysisResult } from "../types";

const CACHE_TTL = 4 * 60 * 60 * 1000;

function cacheKey({ month, year }: Period) {
  return `ai-analysis-${month}-${year}`;
}

function getFromCache(period: Period): AiAnalysisResult | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(period));
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      sessionStorage.removeItem(cacheKey(period));
      return null;
    }
    return data as AiAnalysisResult;
  } catch {
    return null;
  }
}

function saveToCache(period: Period, data: AiAnalysisResult) {
  try {
    sessionStorage.setItem(cacheKey(period), JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // sessionStorage indisponível (modo privado) — segue sem cache
  }
}

export function useAiAnalysis() {
  const analysis = ref<AiAnalysisResult | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function analyze(period: Period) {
    loading.value = true;
    error.value = null;
    analysis.value = null;
    try {
      analysis.value = await insightsApi.analyze(period);
      saveToCache(period, analysis.value);
    } catch {
      error.value = "Não foi possível gerar a análise. Tente novamente.";
    } finally {
      loading.value = false;
    }
  }

  /** Usa a análise em cache (4h por mês) ou gera uma nova. */
  function loadOrFetch(period: Period) {
    const cached = getFromCache(period);
    if (cached) {
      analysis.value = cached;
      return;
    }
    analyze(period);
  }

  return { analysis, loading, error, analyze, loadOrFetch };
}
