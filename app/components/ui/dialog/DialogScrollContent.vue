<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { X } from "lucide-vue-next"
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  useForwardPropsEmits,
} from "reka-ui"
import { cn } from '@/utils'

const props = defineProps<DialogContentProps & { class?: HTMLAttributes["class"] }>()
const emits = defineEmits<DialogContentEmits>()

const delegatedProps = reactiveOmit(props, "class")

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <DialogPortal>
    <DialogOverlay
      class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink-950/55 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:duration-300 data-[state=closed]:duration-200"
    >
      <DialogContent
        :class="
          cn(
            'relative z-50 grid w-full max-w-lg my-8 gap-4 border border-ink-200/70 bg-background p-6 shadow-[0_1px_0_0_rgba(255,255,255,0.7)_inset,0_24px_64px_-16px_rgba(15,23,42,0.22),0_8px_24px_-12px_rgba(15,23,42,0.14)] duration-300 ease-spring sm:rounded-2xl md:w-full',
            props.class,
          )
        "
        v-bind="forwarded"
        @pointer-down-outside="(event) => event.preventDefault()"
        @interact-outside="(event) => event.preventDefault()"
      >
        <slot />

        <DialogClose
          class="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-ink-500 opacity-70 transition-[opacity,background-color,transform,color] duration-300 ease-spring hover:opacity-100 hover:bg-ink-100 hover:text-ink-700 hover:scale-105 active:scale-95 focus:outline-hidden focus-visible:ring-4 focus-visible:ring-ring/20"
        >
          <X class="h-4 w-4" />
          <span class="sr-only">Close</span>
        </DialogClose>
      </DialogContent>
    </DialogOverlay>
  </DialogPortal>
</template>
