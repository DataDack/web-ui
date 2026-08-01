import { cn } from "@/lib/utils"

/**
 * A standalone day-of-month grid (1–`daysInMonth`) laid out 7 columns wide.
 * Controlled via `value` (the selected day number) / `onChange`.
 */
export function DayGridPicker({
    value,
    onChange,
    daysInMonth = 31,
    label = "Day",
    className,
}: Readonly<{
    /** Currently selected day (1–31), or undefined for none. */
    value?: number
    onChange: (day: number) => void
    /** Number of days to render — clamp to a real month when known. */
    daysInMonth?: number
    label?: string
    className?: string
}>) {
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

    return (
        <div
            className={cn(
                "rounded-xl border bg-card p-4 text-card-foreground shadow-sm",
                className
            )}
        >
            {label ? (
                <div className="mb-3 text-center text-sm font-medium text-muted-foreground">
                    {label}
                </div>
            ) : null}
            <div
                role="group"
                className="grid grid-cols-7 justify-items-center gap-y-1"
                aria-label={label || "Day"}
            >
                {days.map((day) => {
                    const selected = value === day
                    return (
                        <button
                            key={day}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => {
                                onChange(day)
                            }}
                            className={cn(
                                "flex size-9 items-center justify-center rounded-md text-sm font-normal tabular-nums outline-none transition-colors",
                                "focus-visible:ring-[3px] focus-visible:ring-ring/50",
                                selected
                                    ? "bg-primary font-medium text-primary-foreground hover:bg-primary/90"
                                    : "hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            {day}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
