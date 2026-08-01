import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

import { CopyButton } from "./CopyButton"

export interface KeyValueItem {
    label: string
    value: ReactNode
    mono?: boolean
    /** Renders the (string) value as a CopyButton */
    copyable?: boolean
}

interface KeyValueGridProps {
    items: KeyValueItem[]
    columns?: 1 | 2 | 3
    className?: string
}

const COLUMN_CLASSES: Record<1 | 2 | 3, string> = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
}

export function KeyValueGrid({ items, columns = 2, className }: Readonly<KeyValueGridProps>) {
    return (
        <dl className={cn("grid gap-x-8 gap-y-4", COLUMN_CLASSES[columns], className)}>
            {items.map((item) => (
                <div key={item.label} className="min-w-0">
                    <dt className="font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground/80 mb-1">
                        {item.label}
                    </dt>
                    <dd
                        className={cn(
                            "text-sm text-foreground break-words",
                            item.mono && "font-mono text-[13px]"
                        )}
                    >
                        {item.copyable && typeof item.value === "string" ? (
                            <CopyButton
                                value={item.value}
                                className="text-foreground text-[13px]"
                            />
                        ) : (
                            (item.value ?? <span className="text-muted-foreground">—</span>)
                        )}
                    </dd>
                </div>
            ))}
        </dl>
    )
}
