<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from '@/utils'

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <tfoot :class="cn('border-t border-ink-200/70 bg-ink-50/40 font-medium last:[&>tr]:border-b-0', props.class)">
    <slot />
  </tfoot>
</template>
