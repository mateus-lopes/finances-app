<script setup lang="ts">
import { cn } from "@/shared/lib/utils";
const props = defineProps<{ class?: string }>();
</script>

<template>
  <label :class="cn('text-xs font-medium text-muted-foreground', props.class)">
    <slot />
  </label>
</template>
