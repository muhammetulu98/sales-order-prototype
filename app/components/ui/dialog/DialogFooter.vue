<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from '@/utils'

const props = defineProps<{ class?: HTMLAttributes["class"] }>()
</script>

<template>
  <div
    :class="
      cn(
        'flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-x-3',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
