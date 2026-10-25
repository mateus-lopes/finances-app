<script setup lang="ts" generic="T extends { label: string; value: unknown }">
import { cn } from "@/shared/lib/utils";

const props = defineProps<{
  modelValue: unknown;
  options: T[];
  placeholder?: string;
  class?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{ "update:modelValue": [value: unknown] }>();
</script>

<template>
  <select
    :value="modelValue as string"
    @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    :disabled="disabled"
    :class="cn(
      'flex h-9 w-full rounded-lg border border-input bg-secondary/50 px-3 py-2 text-sm text-foreground',
      'focus:outline-none focus:ring-2 focus:ring-ring',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'appearance-none cursor-pointer',
      props.class
    )"
  >
    <option v-if="placeholder" value="" disabled :selected="!modelValue">{{ placeholder }}</option>
    <option
      v-for="opt in options"
      :key="String(opt.value)"
      :value="String(opt.value)"
      :selected="String(opt.value) === String(modelValue)"
    >
      {{ opt.label }}
    </option>
  </select>
</template>
