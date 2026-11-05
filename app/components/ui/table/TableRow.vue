<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from '@/utils'

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <!-- Seçim kırmızı %5 tint (The Selection Tint Rule); hover bir üst yüzey katmanı -->
  <tr :class="cn('border-b border-tier-highest transition-colors duration-200 hover:bg-tier data-[state=selected]:bg-primary/5', props.class)">
    <slot />
  </tr>
</template>
