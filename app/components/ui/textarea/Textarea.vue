<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { nextTick, onMounted, ref, watch } from "vue"
import { useVModel } from "@vueuse/core"
import { cn } from '@/utils'

const props = defineProps<{
  class?: HTMLAttributes["class"]
  defaultValue?: string | number
  modelValue?: string | number
  autoResize?: boolean
}>()

const emits = defineEmits<{
  (e: "update:modelValue", payload: string | number): void
}>()

const modelValue = useVModel(props, "modelValue", emits, {
  passive: true,
  defaultValue: props.defaultValue,
})

const textareaRef = ref<HTMLTextAreaElement | null>(null)

function resize() {
  const el = textareaRef.value
  if (!el || !props.autoResize) return
  el.style.height = "auto"
  el.style.height = `${el.scrollHeight}px`
}

onMounted(() => {
  if (props.autoResize) nextTick(resize)
})

watch(modelValue, () => {
  if (props.autoResize) nextTick(resize)
})
</script>

<template>
  <textarea ref="textareaRef" v-model="modelValue" :class="cn('flex min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors duration-150 placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0 focus-visible:border-ring hover:border-ring/40 disabled:cursor-not-allowed disabled:opacity-50', autoResize && 'resize-none overflow-hidden', props.class)" />
</template>
