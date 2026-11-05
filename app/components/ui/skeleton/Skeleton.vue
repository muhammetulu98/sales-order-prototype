<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from '@/utils'

interface SkeletonProps {
  class?: HTMLAttributes["class"]
}

const props = defineProps<SkeletonProps>()
</script>

<template>
  <div :class="cn('relative overflow-hidden rounded-md bg-muted before:absolute before:inset-0 before:-translate-x-full before:animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] before:bg-linear-to-r before:from-transparent before:via-white/20 before:to-transparent', props.class)" />
</template>
