import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border border-slate-800 bg-slate-900/50 text-slate-100 shadow-sm backdrop-blur-sm transition-all hover:bg-slate-900",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

export { Card }
