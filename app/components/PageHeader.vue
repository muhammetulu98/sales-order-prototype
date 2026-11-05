<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <div class="mb-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div class="min-w-0">
      <h1 class="text-balance wrap-break-word text-xl font-semibold leading-tight tracking-[-0.01em] text-ink">{{ title }}</h1>
      <p v-if="description" class="mt-1 text-pretty wrap-break-word text-[13px] text-ink-muted">{{ description }}</p>
    </div>
    <div class="flex w-full min-w-0 flex-wrap items-stretch gap-2 sm:w-auto sm:items-center sm:justify-end">
      <slot name="actions" />
    </div>
  </div>
</template>
