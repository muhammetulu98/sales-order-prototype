<script setup lang="ts">
import type { CalendarCellTriggerProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { CalendarCellTrigger, useForwardProps } from "reka-ui"
import { cn } from "@/utils"

const props = defineProps<CalendarCellTriggerProps & { class?: HTMLAttributes["class"] }>()
const delegated = reactiveOmit(props, "class")
const forwarded = useForwardProps(delegated)
</script>

<template>
  <CalendarCellTrigger
    v-bind="forwarded"
    :class="
      cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-normal text-ink-700 transition-colors',
        'hover:bg-ink-100 hover:text-ink-900',
        'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/40',
        'data-selected:bg-primary data-selected:text-white data-selected:hover:bg-primary data-selected:hover:text-white data-selected:font-semibold',
        'data-today:bg-ink-100 data-today:font-semibold data-today:text-ink-900',
        'data-selected:data-today:bg-primary data-selected:data-today:text-white',
        'data-outside-view:text-ink-300',
        'data-disabled:text-ink-300 data-disabled:opacity-50 data-disabled:pointer-events-none',
        'data-unavailable:text-ink-400 data-unavailable:line-through',
        'data-highlighted:bg-primary/10',
        props.class,
      )
    "
  >
    <slot />
  </CalendarCellTrigger>
</template>
