import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { Period } from "@/shared/types";

/** Competência selecionada no navegador de meses (compartilhada por todas as telas). */
export const useMonthStore = defineStore("month", () => {
  const now = new Date();
  const month = ref(now.getMonth() + 1);
  const year = ref(now.getFullYear());

  const period = computed<Period>(() => ({ month: month.value, year: year.value }));

  const label = computed(() =>
    new Date(year.value, month.value - 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    })
  );

  function prev() {
    if (month.value === 1) {
      month.value = 12;
      year.value--;
    } else {
      month.value--;
    }
  }

  function next() {
    if (month.value === 12) {
      month.value = 1;
      year.value++;
    } else {
      month.value++;
    }
  }

  return { month, year, period, label, prev, next };
});
