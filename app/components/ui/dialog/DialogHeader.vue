<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from '@/utils'

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <div
    :class="cn('flex shrink-0 flex-col gap-y-2 pr-10 text-center sm:text-left', props.class)"
  >
    <slot />
  </div>
</template>
