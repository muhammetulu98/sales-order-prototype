<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from '@/utils'

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <h3
    :class="
      cn('text-[16px] font-semibold leading-tight tracking-[-0.005em] text-brand-800', props.class)
    "
  >
    <slot />
  </h3>
</template>
