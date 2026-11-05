<script setup lang="ts">
import type {
  CalendarRootEmits,
  CalendarRootProps,
} from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import {
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHead,
  CalendarGridRow,
  CalendarHeadCell,
  CalendarHeader,
  CalendarRoot,
  useForwardPropsEmits,
} from "reka-ui"
import { cn } from "@/utils"
import CalendarCell from "./CalendarCell.vue"
import CalendarCellTrigger from "./CalendarCellTrigger.vue"
import CalendarHeading from "./CalendarHeading.vue"
import CalendarNext from "./CalendarNext.vue"
import CalendarPrev from "./CalendarPrev.vue"

const props = withDefaults(
  defineProps<CalendarRootProps & { class?: HTMLAttributes["class"] }>(),
  {
    weekdayFormat: "short",
    locale: "tr-TR",
  },
)
const emits = defineEmits<CalendarRootEmits>()

const delegatedProps = reactiveOmit(props, "class")
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <CalendarRoot
    v-slot="{ grid, weekDays }"
    v-bind="forwarded"
    :class="cn('rounded-md border border-ink-200 bg-white p-3', props.class)"
  >
    <CalendarHeader class="flex items-center justify-between gap-2 pb-2">
      <CalendarPrev />
      <CalendarHeading class="text-sm font-medium text-ink-700" />
      <CalendarNext />
    </CalendarHeader>
    <div class="flex flex-col gap-2 pt-1 sm:flex-row sm:gap-4">
      <CalendarGrid
        v-for="month in grid"
        :key="month.value.toString()"
        class="w-full border-collapse select-none space-y-1"
      >
        <CalendarGridHead>
          <CalendarGridRow class="mb-1 flex w-full">
            <CalendarHeadCell
              v-for="day in weekDays"
              :key="day"
              class="w-9 rounded-md text-[10px] font-medium uppercase tracking-wide text-ink-400"
            >
              {{ day }}
            </CalendarHeadCell>
          </CalendarGridRow>
        </CalendarGridHead>
        <CalendarGridBody class="grid">
          <CalendarGridRow
            v-for="(weekDates, index) in month.rows"
            :key="`${month.value}-${index}`"
            class="mt-1 flex w-full"
          >
            <CalendarCell
              v-for="weekDate in weekDates"
              :key="weekDate.toString()"
              :date="weekDate"
            >
              <CalendarCellTrigger
                :day="weekDate"
                :month="month.value"
              />
            </CalendarCell>
          </CalendarGridRow>
        </CalendarGridBody>
      </CalendarGrid>
    </div>
  </CalendarRoot>
</template>
