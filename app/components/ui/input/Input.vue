<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();

// Industrial Terminal input: 32px, Paper zemin, 1px tier border, 2px radius;
// odakta 1px Pressed Red border + %20 kırmızı halka (DESIGN.md · Inputs).
const model = defineModel<string | number | null>();
</script>

<template>
  <input
    v-model="model"
    :class="
      cn(
        'flex h-8 w-full rounded-md border border-input bg-paper px-2 text-[13px] text-ink transition-colors placeholder:text-ink-muted/70 focus-visible:outline-hidden focus-visible:border-action-deep focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50',
        props.class,
      )
    "
  />
</template>
