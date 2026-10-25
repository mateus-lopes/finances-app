<script setup lang="ts">
import { cn } from "@/shared/lib/utils";
const props = defineProps<{ value: number; class?: string; color?: string }>();
</script>

<template>
  <div :class="cn('h-1.5 w-full overflow-hidden rounded-full bg-secondary', props.class)">
    <div
      class="h-full rounded-full transition-all duration-500"
      :style="{ width: `${Math.min(100, Math.max(0, value))}%`, background: color ?? 'hsl(var(--primary))' }"
    />
  </div>
</template>
