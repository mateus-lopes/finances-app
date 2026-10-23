<script setup lang="ts">
import { cn } from "@/shared/lib/utils";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "muted";

const props = defineProps<{ variant?: BadgeVariant; class?: string }>();

const variantClass: Record<BadgeVariant, string> = {
  default:     "bg-primary/20 text-primary border border-primary/30",
  secondary:   "bg-secondary text-secondary-foreground",
  destructive: "bg-destructive/20 text-red-400 border border-destructive/30",
  outline:     "border border-border text-foreground",
  success:     "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
  warning:     "bg-amber-500/15 text-amber-400 border border-amber-500/25",
  muted:       "bg-muted text-muted-foreground",
};
</script>

<template>
  <span :class="cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors', variantClass[variant ?? 'default'], props.class)">
    <slot />
  </span>
</template>
