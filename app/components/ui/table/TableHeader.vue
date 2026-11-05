<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from '@/utils'

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <thead :class="cn('bg-surface [&_tr]:border-b [&_tr]:border-tier-highest [&_tr:hover]:bg-surface', props.class)">
    <slot />
  </thead>
</template>
