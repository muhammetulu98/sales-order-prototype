import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

export { default as Badge } from "./Badge.vue"

// Industrial Terminal çip dili: 2px radius, 1px kenarlıklı tint — pill YOK.
// Durum üçlüsü DESIGN.md'nin amber/mavi/yeşil setidir; kırmızı çip yalnız error.
export const badgeVariants = cva(
  "inline-flex gap-1 items-center rounded border px-1.5 py-0.5 text-[11px] font-medium leading-4 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/20",
  {
    variants: {
      variant: {
        default: "bg-tier border-tier-highest text-ink",
        secondary: "bg-tier-low border-tier-highest text-ink-muted",
        destructive: "bg-[#ffdad6] border-[#ffb4ab] text-[#93000a]",
        outline: "border-tier-highest bg-paper text-ink",
        pending:
          "bg-status-pending-bg border-status-pending-border text-status-pending-text",
        shipped:
          "bg-status-shipped-bg border-status-shipped-border text-status-shipped-text",
        delivered:
          "bg-status-delivered-bg border-status-delivered-border text-status-delivered-text",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export type BadgeVariants = VariantProps<typeof badgeVariants>
