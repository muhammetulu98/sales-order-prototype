<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from '@/utils'

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <!-- The Mono Data Rule: kolon başlıkları mono, 11px, geniş izlemeli, büyük harf -->
  <th :class="cn('h-9 px-3 text-left align-middle font-mono text-[11px] font-medium uppercase tracking-[0.05em] text-ink-muted has-[[role=checkbox]]:pr-0', props.class)">
    <slot />
  </th>
</template>
