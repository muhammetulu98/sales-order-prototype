<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from '@/utils'

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <div :class="cn('flex items-start justify-between gap-3 p-5', props.class)">
    <slot />
  </div>
</template>
