import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

export { default as Button } from "./Button.vue";

// Industrial Terminal: 32px bar kontrolü, 2px radius, düz yüzey.
// The Red Ladder Rule — default: #e31e24 → hover #ba0013 (kararır, asla parlamaz).
// The Flat-By-Default Rule — yalnız birincil aksiyon shadow-sm taşır.
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[13px] font-medium transition-colors duration-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-action-deep disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-action text-primary-foreground shadow-xs hover:bg-action-deep",
        secondary:
          "bg-tier border border-tier-highest text-ink hover:bg-tier-high",
        outline:
          "border border-input bg-paper text-ink hover:bg-tier-low",
        ghost: "text-ink-muted hover:bg-tier hover:text-ink",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "text-action-deep underline-offset-2 hover:underline",
      },
      size: {
        default: "h-8 px-4",
        sm: "h-7 px-3 text-xs",
        lg: "h-9 px-4",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
