<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from '@/utils'
import { Button } from '@/components/ui/button'

interface Props {
  title: string
  description?: string
  icon?: string
  actionLabel?: string
  class?: HTMLAttributes["class"]
}

// Şablon `props.class` okuduğundan defineProps bir değişkene atanmak zorunda;
// atanmayınca render'da "Cannot read properties of undefined (reading 'class')"
// hatasıyla bileşen çöküyordu.
const props = defineProps<Props>()
const emit = defineEmits<{ action: [] }>()
</script>

<template>
  <div
    :class="
      cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-12 text-center',
        props.class,
      )
    "
  >
    <div class="mb-4 flex size-12 items-center justify-center rounded-xl border bg-muted/40 text-muted-foreground shadow-xs">
      <slot name="icon">
        <svg v-if="!icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="m9 16 3-3 3 3"/></svg>
        <span v-else>{{ icon }}</span>
      </slot>
    </div>

    <h3 class="m-0 mb-1 text-base font-semibold text-foreground">{{ title }}</h3>

    <p v-if="description" class="mx-auto mb-6 max-w-md text-sm leading-relaxed text-muted-foreground">{{ description }}</p>

    <div v-if="actionLabel || $slots.action" class="mt-2">
      <slot name="action">
        <Button variant="outline" @click="emit('action')">{{ actionLabel }}</Button>
      </slot>
    </div>
  </div>
</template>
