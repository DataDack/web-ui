import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface HomePanelProps {
    title: ReactNode
    /** Right-aligned slot in the header (timestamp, badge, …). */
    action?: ReactNode
    /** Optional footer row, separated by a hairline. */
    footer?: ReactNode
    children: ReactNode
    className?: string
    bodyClassName?: string
}

/** Flat, bordered surface used for every Console-home card. */
export function HomePanel({
    title,
    action,
    footer,
    children,
    className,
    bodyClassName,
}: Readonly<HomePanelProps>) {
    return (
        <section
            className={cn(
                "console-card flex flex-col rounded-2xl border border-border bg-card/50 backdrop-blur-sm",
                className
            )}
        >
            <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
                <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
                    {title}
                </h2>
                {action && <div className="text-xs text-muted-foreground">{action}</div>}
            </header>
            <div className={cn("flex-1 px-5", bodyClassName)}>{children}</div>
            {footer && <div className="mt-1 border-t border-border px-5 py-3.5">{footer}</div>}
        </section>
    )
}
