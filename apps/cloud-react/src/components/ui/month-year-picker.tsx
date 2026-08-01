import { ChevronLeft } from "lucide-react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
] as const

/**
 * Split month + year selector: a scrollable month column beside a scrollable
 * year grid. Both halves are controlled independently.
 */
export function MonthYearPicker({
    month,
    year,
    onMonthChange,
    onYearChange,
    onBack,
    fromYear = 1900,
    toYear = new Date().getFullYear(),
    className,
}: Readonly<{
    /** Selected month index (0–11), or undefined for none. */
    month?: number
    /** Selected full year, or undefined for none. */
    year?: number
    onMonthChange: (month: number) => void
    onYearChange: (year: number) => void
    /** Optional back action — renders the header chevron when provided. */
    onBack?: () => void
    fromYear?: number
    toYear?: number
    className?: string
}>) {
    const years = Array.from({ length: toYear - fromYear + 1 }, (_, i) => fromYear + i)

    return (
        <div className={cn("rounded-xl border bg-card text-card-foreground shadow-sm", className)}>
            <div className="flex items-center justify-between px-4 pt-4 pb-2 text-sm font-medium text-muted-foreground">
                <div className="flex items-center gap-1">
                    {onBack ? (
                        <button
                            type="button"
                            onClick={onBack}
                            aria-label="Back"
                            className="-ml-1 flex size-6 items-center justify-center rounded-md text-primary outline-none transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                            <ChevronLeft className="size-4" />
                        </button>
                    ) : null}
                    <span>Month</span>
                </div>
                <span>Year</span>
            </div>
            <div className="grid grid-cols-[7rem_1fr] gap-2 px-4 pb-4">
                <ScrollArea className="h-56">
                    <div className="flex flex-col gap-1 pr-3">
                        {MONTHS.map((name, index) => {
                            const selected = month === index
                            return (
                                <button
                                    key={name}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => {
                                        onMonthChange(index)
                                    }}
                                    className={cn(
                                        "rounded-md px-3 py-2 text-left text-sm outline-none transition-colors",
                                        "focus-visible:ring-[3px] focus-visible:ring-ring/50",
                                        selected
                                            ? "bg-primary font-medium text-primary-foreground hover:bg-primary/90"
                                            : "hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    {name}
                                </button>
                            )
                        })}
                    </div>
                </ScrollArea>
                <ScrollArea className="h-56 border-l pl-2">
                    <div className="grid grid-cols-3 gap-1 pr-3">
                        {years.map((value) => {
                            const selected = year === value
                            return (
                                <button
                                    key={value}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => {
                                        onYearChange(value)
                                    }}
                                    className={cn(
                                        "rounded-md px-2 py-2 text-center text-sm outline-none transition-colors",
                                        "focus-visible:ring-[3px] focus-visible:ring-ring/50",
                                        selected
                                            ? "bg-primary font-medium text-primary-foreground hover:bg-primary/90"
                                            : "hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    {value}
                                </button>
                            )
                        })}
                    </div>
                </ScrollArea>
            </div>
        </div>
    )
}

export { MONTHS }
