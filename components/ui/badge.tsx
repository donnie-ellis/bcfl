import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80 duration-200 transition-colors",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 duration-200 transition-colors",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 duration-200 transition-colors",
        outline: "text-foreground",
        warn: "border-transparent bg-warn text-warn-foreground hover:bg-warn/80 duration-200 transition-colors",
        success:
          "border-transparent bg-success text-success-foreground hover:bg-success/80 duration-200 transition-colors",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
