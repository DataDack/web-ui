import type { ReactNode } from "react"

import { cn } from "@datadack/common-ui"

interface SectionProps {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  variant?: "plain" | "panel"
  className?: string
}

export function Section({
  title,
  description,
  actions,
  children,
  variant = "plain",
  className,
}: Readonly<SectionProps>) {
  return (
    <section className={cn(variant === "panel" && "glass-2 p-5", className)}>
      {(title ?? actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}
