<script setup lang="ts">
import type { CalendarNextProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { CalendarNext, useForwardProps } from "reka-ui"
import { ChevronRight } from "lucide-vue-next"
import { cn } from "@/utils"

const props = defineProps<CalendarNextProps & { class?: HTMLAttributes["class"] }>()
const delegated = reactiveOmit(props, "class")
const forwarded = useForwardProps(delegated)
</script>

<template>
  <CalendarNext
    v-bind="forwarded"
    :class="cn('inline-flex h-7 w-7 items-center justify-center rounded-md border border-ink-200 bg-white text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900 disabled:opacity-40 disabled:pointer-events-none', props.class)"
  >
    <ChevronRight class="h-4 w-4" />
  </CalendarNext>
</template>
