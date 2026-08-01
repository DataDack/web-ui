import * as React from "react"

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, getDefaultClassNames } from "react-day-picker"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: React.ComponentProps<typeof DayPicker>) {
    const defaultClassNames = getDefaultClassNames()

    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-3", className)}
            classNames={{
                root: cn("w-fit", defaultClassNames.root),
                months: cn(
                    "relative flex flex-col gap-4 sm:flex-row",
                    defaultClassNames.months
                ),
                month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
                nav: cn(
                    "absolute inset-x-0 top-0 flex w-full items-center justify-between",
                    defaultClassNames.nav
                ),
                button_previous: cn(
                    buttonVariants({ variant: "ghost" }),
                    "size-7 p-0 opacity-50 hover:opacity-100",
                    defaultClassNames.button_previous
                ),
                button_next: cn(
                    buttonVariants({ variant: "ghost" }),
                    "size-7 p-0 opacity-50 hover:opacity-100",
                    defaultClassNames.button_next
                ),
                month_caption: cn(
                    "flex h-7 items-center justify-center px-8",
                    defaultClassNames.month_caption
                ),
                caption_label: cn(
                    "flex items-center gap-1 text-sm font-medium [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
                    defaultClassNames.caption_label
                ),
                dropdowns: cn(
                    "flex w-full items-center justify-center gap-1.5 text-sm font-medium",
                    defaultClassNames.dropdowns
                ),
                dropdown_root: cn(
                    "relative rounded-md border border-input shadow-xs has-focus:border-ring has-focus:ring-[3px] has-focus:ring-ring/50",
                    defaultClassNames.dropdown_root
                ),
                dropdown: cn(
                    "absolute inset-0 bg-popover opacity-0",
                    defaultClassNames.dropdown
                ),
                month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
                weekdays: cn("flex", defaultClassNames.weekdays),
                weekday: cn(
                    "w-9 rounded-md text-[0.8rem] font-normal text-muted-foreground",
                    defaultClassNames.weekday
                ),
                week: cn("mt-2 flex w-full", defaultClassNames.week),
                day: cn(
                    "relative size-9 p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:rounded-md [&:has([aria-selected])]:bg-accent",
                    defaultClassNames.day
                ),
                day_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "size-9 p-0 font-normal aria-selected:opacity-100",
                    defaultClassNames.day_button
                ),
                selected: cn(
                    "rounded-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    defaultClassNames.selected
                ),
                today: cn(
                    "rounded-md bg-accent text-accent-foreground",
                    defaultClassNames.today
                ),
                outside: cn(
                    "text-muted-foreground aria-selected:text-muted-foreground",
                    defaultClassNames.outside
                ),
                disabled: cn(
                    "text-muted-foreground opacity-50",
                    defaultClassNames.disabled
                ),
                hidden: cn("invisible", defaultClassNames.hidden),
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation, className: chevClassName, ...chevProps }) => {
                    const Icon =
                        orientation === "left"
                            ? ChevronLeft
                            : orientation === "right"
                              ? ChevronRight
                              : ChevronDown
                    return <Icon className={cn("size-4", chevClassName)} {...chevProps} />
                },
            }}
            {...props}
        />
    )
}

export { Calendar }
