<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from '@/utils'

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <div
    :class="
      cn(
        'flex flex-col-reverse sm:flex-row sm:flex-wrap sm:justify-end sm:gap-x-2 sm:gap-y-2',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
