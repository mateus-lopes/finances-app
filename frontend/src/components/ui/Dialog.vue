<script setup lang="ts">
import { computed } from "vue";
import { cn } from "@/lib/utils";

const props = defineProps<{
  open: boolean;
  title?: string;
  class?: string;
}>();

const emit = defineEmits<{ "update:open": [value: boolean] }>();
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="open" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/70 backdrop-blur-sm"
          @click="emit('update:open', false)"
        />
        <!-- Panel -->
        <div
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          :class="cn(
            'relative z-10 w-full sm:max-w-md bg-popover border border-border rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl',
            'max-h-[90dvh] overflow-y-auto',
            props.class
          )"
        >
          <div v-if="title" class="flex items-center justify-between mb-5">
            <h2 class="text-base font-semibold text-foreground">{{ title }}</h2>
            <button
              class="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-secondary"
              @click="emit('update:open', false)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
  transition: all 0.2s ease;
}
.dialog-enter-active .absolute,
.dialog-leave-active .absolute {
  transition: opacity 0.2s ease;
}
.dialog-enter-from .absolute { opacity: 0; }
.dialog-leave-to .absolute { opacity: 0; }
.dialog-enter-from .relative { transform: translateY(100%); }
.dialog-leave-to .relative { transform: translateY(100%); }
@media (min-width: 640px) {
  .dialog-enter-from .relative { transform: scale(0.95) translateY(0); }
  .dialog-leave-to .relative { transform: scale(0.95) translateY(0); opacity: 0; }
}
</style>
