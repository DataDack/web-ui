import type React from "react"

import { Label } from "@/components/ui/label"

export function FieldError({ message }: Readonly<{ message?: string }>) {
    if (!message) return null
    return <p className="text-[11px] text-destructive">{message}</p>
}

export function FieldLabel({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            {children}
        </Label>
    )
}
