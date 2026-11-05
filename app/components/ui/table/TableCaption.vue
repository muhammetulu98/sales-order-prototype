<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from '@/utils'

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <caption :class="cn('mt-4 text-[13px] text-ink-500', props.class)">
    <slot />
  </caption>
</template>
