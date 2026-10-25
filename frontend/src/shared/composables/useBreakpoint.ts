import { ref, onMounted, onUnmounted } from "vue";

export function useIsDesktop() {
  const isDesktop = ref(typeof window !== "undefined" ? window.innerWidth >= 1024 : false);

  function update() {
    isDesktop.value = window.innerWidth >= 1024;
  }

  onMounted(() => window.addEventListener("resize", update));
  onUnmounted(() => window.removeEventListener("resize", update));

  return isDesktop;
}
