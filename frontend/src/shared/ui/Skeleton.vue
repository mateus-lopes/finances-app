<script setup lang="ts">
import { cn } from "@/shared/lib/utils";
const props = defineProps<{ class?: string }>();
</script>

<template>
  <div
    :class="cn(
      'rounded-lg bg-gradient-to-r from-secondary via-muted to-secondary bg-[length:200%_100%] animate-shimmer',
      props.class
    )"
  />
</template>
