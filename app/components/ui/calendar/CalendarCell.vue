<script setup lang="ts">
import type { CalendarCellProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { CalendarCell, useForwardProps } from "reka-ui"
import { cn } from "@/utils"

const props = defineProps<CalendarCellProps & { class?: HTMLAttributes["class"] }>()
const delegated = reactiveOmit(props, "class")
const forwarded = useForwardProps(delegated)
</script>

<template>
  <CalendarCell
    v-bind="forwarded"
    :class="cn('relative p-0 text-center text-sm focus-within:relative focus-within:z-20', props.class)"
  >
    <slot />
  </CalendarCell>
</template>
