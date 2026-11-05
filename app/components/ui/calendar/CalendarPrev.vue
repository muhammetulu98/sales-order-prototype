<script setup lang="ts">
import type { CalendarPrevProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { CalendarPrev, useForwardProps } from "reka-ui"
import { ChevronLeft } from "lucide-vue-next"
import { cn } from "@/utils"

const props = defineProps<CalendarPrevProps & { class?: HTMLAttributes["class"] }>()
const delegated = reactiveOmit(props, "class")
const forwarded = useForwardProps(delegated)
</script>

<template>
  <CalendarPrev
    v-bind="forwarded"
    :class="cn('inline-flex h-7 w-7 items-center justify-center rounded-md border border-ink-200 bg-white text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900 disabled:opacity-40 disabled:pointer-events-none', props.class)"
  >
    <ChevronLeft class="h-4 w-4" />
  </CalendarPrev>
</template>
