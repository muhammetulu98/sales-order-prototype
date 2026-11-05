<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/utils";
import { type ButtonVariants, buttonVariants } from ".";

interface Props {
  variant?: ButtonVariants["variant"];
  size?: ButtonVariants["size"];
  class?: HTMLAttributes["class"];
  type?: "button" | "submit" | "reset";
}

const props = withDefaults(defineProps<Props>(), {
  variant: "default",
  size: "default",
  class: undefined,
  type: "button",
});
</script>

<template>
  <button
    :type="props.type"
    :class="cn(buttonVariants({ variant: props.variant, size: props.size }), props.class)"
  >
    <slot />
  </button>
</template>
