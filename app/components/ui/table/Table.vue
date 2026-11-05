<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from '@/utils'

const props = defineProps<{
  class?: HTMLAttributes["class"]
  /**
   * Sarmalayıcı div'in sınıfı. Varsayılan `overflow-auto`, geniş tablolara yatay
   * kaydırma verir — ama aynı zamanda bu div'i bir kaydırma konteyneri yapar ve
   * `sticky` TableHeader ONA göre çözülür. Tabloyu DIŞARIDAN kaydıran bir kapsayıcı
   * varsa (yükseklik sınırlı + overflow-y-auto) başlık asla yapışmaz; o durumda
   * `wrapper-class="overflow-visible"` verilir.
   */
  wrapperClass?: HTMLAttributes["class"]
}>()
</script>

<template>
  <div :class="cn('relative w-full overflow-auto', props.wrapperClass)">
    <table :class="cn('w-full caption-bottom text-sm', props.class)">
      <slot />
    </table>
  </div>
</template>
