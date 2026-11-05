<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from '@/utils'

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <td
    :class="
      cn(
        'py-2.5 px-3 align-middle text-[13px] text-foreground has-[[role=checkbox]]:pr-0',
        props.class,
      )
    "
  >
    <slot />
  </td>
</template>
