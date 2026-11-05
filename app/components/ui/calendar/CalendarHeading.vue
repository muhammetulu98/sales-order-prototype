<script setup lang="ts">
import type { CalendarHeadingProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { CalendarHeading, useForwardProps } from "reka-ui"
import { cn } from "@/utils"

const props = defineProps<CalendarHeadingProps & { class?: HTMLAttributes["class"] }>()
const delegated = reactiveOmit(props, "class")
const forwarded = useForwardProps(delegated)
</script>

<template>
  <CalendarHeading
    v-slot="{ headingValue }"
    v-bind="forwarded"
    :class="cn('text-sm font-medium text-ink-700 capitalize', props.class)"
  >
    {{ headingValue }}
  </CalendarHeading>
</template>
