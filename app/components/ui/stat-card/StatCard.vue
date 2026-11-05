<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from '@/utils'

type TrendDirection = 'up' | 'down' | 'neutral'

interface Props {
  title?: string
  value?: string | number
  icon?: string
  trend?: string
  trendDirection?: TrendDirection
  trendLabel?: string
  loading?: boolean
  class?: HTMLAttributes["class"]
}

const props = withDefaults(defineProps<Props>(), {
  trendDirection: 'neutral',
  loading: false,
})
</script>

<template>
  <div
    :class="
      cn(
        'flex flex-col gap-4 rounded-2xl border bg-card p-6 text-card-foreground shadow-[0_1px_3px_rgba(15,23,42,0.06),0_4px_16px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_1px_3px_rgba(15,23,42,0.07),0_8px_24px_rgba(15,23,42,0.09)]',
        props.class,
      )
    "
  >
    <div v-if="loading" class="space-y-3">
      <div class="h-4 w-24 animate-pulse rounded bg-muted" />
      <div class="h-8 w-32 animate-pulse rounded bg-muted" />
      <div class="h-3 w-40 animate-pulse rounded bg-muted" />
    </div>

    <div v-else-if="$slots.default">
      <slot />
    </div>

    <template v-else>
      <div class="flex items-start justify-between">
        <h3 class="m-0 text-balance text-[13px] font-semibold text-muted-foreground">{{ title }}</h3>
        <div v-if="$slots.icon || icon" class="flex items-center justify-center text-muted-foreground/70">
          <slot name="icon">
            <span>{{ icon }}</span>
          </slot>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <div class="text-3xl font-bold leading-none tabular-nums tracking-tight text-foreground">{{ value }}</div>

        <div v-if="trend || trendLabel" class="flex items-center gap-2">
          <span
            v-if="trend"
            :class="cn(
              'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold',
              trendDirection === 'up' && 'bg-emerald-50 text-emerald-600',
              trendDirection === 'down' && 'bg-rose-50 text-rose-600',
              trendDirection === 'neutral' && 'bg-muted text-muted-foreground',
            )"
          >
            <svg v-if="trendDirection === 'up'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            <svg v-else-if="trendDirection === 'down'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>
            <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {{ trend }}
          </span>
          <span v-if="trendLabel" class="text-xs text-muted-foreground">{{ trendLabel }}</span>
        </div>
      </div>

      <div v-if="$slots.footer" class="border-t border-border/40 pt-3 text-xs leading-relaxed text-muted-foreground">
        <slot name="footer" />
      </div>
    </template>
  </div>
</template>
