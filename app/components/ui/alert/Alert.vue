<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/utils";
import { type AlertVariants, alertVariants } from ".";

const props = defineProps<{
  variant?: AlertVariants["variant"];
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <div role="alert" :class="cn(alertVariants({ variant: props.variant }), props.class)">
    <slot />
  </div>
</template>
