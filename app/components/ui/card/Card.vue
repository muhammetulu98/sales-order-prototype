<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from '@/utils'

const props = withDefaults(defineProps<{
  class?: HTMLAttributes["class"]
  variant?: 'default' | 'flat' | 'transparent' | 'inner'
}>(), {
  variant: 'default'
})
</script>

<template>
  <div
    :class="
      cn(
        // The Flat-By-Default Rule: panel = Paper + 1px çerçeve, gölge/lift yok.
        'rounded-lg',
        {
          'border border-tier-highest bg-card text-card-foreground': props.variant === 'default',
          'border-none bg-transparent': props.variant === 'transparent',
          'border border-tier-highest bg-transparent': props.variant === 'flat',
          'border border-tier-highest bg-tier-low': props.variant === 'inner',
        },
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
