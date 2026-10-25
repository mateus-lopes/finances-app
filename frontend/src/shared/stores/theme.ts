import { defineStore } from "pinia";
import { ref } from "vue";

export const useThemeStore = defineStore("theme", () => {
  const isDark = ref(localStorage.getItem("theme") === "dark");

  function apply() {
    document.documentElement.classList.toggle("dark", isDark.value);
  }

  function toggle() {
    isDark.value = !isDark.value;
    localStorage.setItem("theme", isDark.value ? "dark" : "light");
    apply();
  }

  apply();

  return { isDark, toggle };
});
