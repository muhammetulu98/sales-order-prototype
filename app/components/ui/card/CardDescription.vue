<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from '@/utils'

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <p :class="cn('text-[13px] leading-relaxed text-ink-500', props.class)">
    <slot />
  </p>
</template>
