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
      class="fixed inset-0 z-50 bg-ink-950/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:duration-200 data-[state=closed]:duration-150"
    />
    <DialogContent
      v-bind="forwarded"
      :class="
        cn(
          'fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden border border-tier-highest bg-paper p-6 shadow-[0_16px_40px_-16px_rgba(16,19,21,0.25)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg',
          props.class,
        )"
      @pointer-down-outside="(event) => event.preventDefault()"
      @interact-outside="(event) => event.preventDefault()"
    >
      <slot />

      <DialogClose
        class="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-md text-ink-muted transition-colors duration-200 hover:bg-tier hover:text-ink focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/20 disabled:pointer-events-none"
      >
        <X class="h-4 w-4" />
        <span class="sr-only">Kapat</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
