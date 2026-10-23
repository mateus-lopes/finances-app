<script setup lang="ts">
import { useAuthStore } from "@/modules/identity";
import { useIsDesktop } from "@/shared/composables/useBreakpoint";
import BottomNav from "@/app/navigation/BottomNav.vue";
import FloatingAddButton from "@/app/navigation/FloatingAddButton.vue";
import DesktopLayout from "@/app/layouts/DesktopLayout.vue";
import Toast from "@/shared/ui/Toast.vue";
import OfflineBanner from "@/shared/components/OfflineBanner.vue";
import PwaUpdatePrompt from "@/shared/components/PwaUpdatePrompt.vue";

const auth = useAuthStore();
const isDesktop = useIsDesktop();
</script>

<template>
  <OfflineBanner />
  <Toast />
  <template v-if="isDesktop && auth.isAuthenticated">
    <DesktopLayout />
  </template>
  <template v-else>
    <RouterView />
    <template v-if="auth.isAuthenticated">
      <BottomNav />
      <PwaUpdatePrompt />
    </template>
  </template>
  <FloatingAddButton v-if="auth.isAuthenticated" />
</template>
