<script setup lang="ts">
defineProps<{
  tabs: { key: string; label: string; count?: number }[];
  modelValue: string;
}>();

const emit = defineEmits<{ "update:modelValue": [key: string] }>();
</script>

<template>
  <div>
    <div class="flex gap-1 border-b border-border pb-0 mb-4 overflow-x-auto scrollbar-hide">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        @click="emit('update:modelValue', tab.key)"
        :class="[
          'relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
          modelValue === tab.key
            ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full'
            : 'text-muted-foreground hover:text-foreground'
        ]"
      >
        {{ tab.label }}
        <span
          v-if="tab.count !== undefined"
          :class="[
            'text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center',
            modelValue === tab.key ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
          ]"
        >{{ tab.count }}</span>
      </button>
    </div>
    <slot />
  </div>
</template>
