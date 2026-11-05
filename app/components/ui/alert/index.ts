import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

export { default as Alert } from "./Alert.vue";
export { default as AlertDescription } from "./AlertDescription.vue";
export { default as AlertTitle } from "./AlertTitle.vue";

// Durum çipleriyle aynı dil: kenarlıklı tint, 2px radius, gölge yok.
export const alertVariants = cva(
  "relative w-full rounded-md border px-3 py-2.5 text-[13px] [&>svg]:size-4",
  {
    variants: {
      variant: {
        default: "bg-tier-low border-tier-highest text-ink",
        info: "bg-status-shipped-bg border-status-shipped-border text-status-shipped-text",
        warning:
          "bg-status-pending-bg border-status-pending-border text-status-pending-text",
        success:
          "bg-status-delivered-bg border-status-delivered-border text-status-delivered-text",
        destructive: "bg-[#ffdad6] border-[#ffb4ab] text-[#93000a]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type AlertVariants = VariantProps<typeof alertVariants>;
