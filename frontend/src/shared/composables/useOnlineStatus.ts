import { ref, onMounted, onUnmounted } from "vue";

export function useOnlineStatus() {
  const isOnline = ref(typeof navigator !== "undefined" ? navigator.onLine : true);

  function onOnline() { isOnline.value = true; }
  function onOffline() { isOnline.value = false; }

  onMounted(() => {
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
  });

  onUnmounted(() => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  });

  return { isOnline };
}
