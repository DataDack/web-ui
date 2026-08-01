import type { LucideIcon } from "lucide-react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"

import { EASE } from "./motion-config"

export interface AnimatedTab {
    value: string
    label: string
    icon?: LucideIcon
    count?: number
}

interface AnimatedTabsProps {
    tabs: AnimatedTab[]
    value: string
    onChange: (value: string) => void
    /** Unique per tab group on screen — motion layoutId namespace */
    layoutId: string
    className?: string
}

export function AnimatedTabs({ tabs, value, onChange, layoutId, className }: Readonly<AnimatedTabsProps>) {
    return (
        <div
            role="tablist"
            className={cn(
                "flex items-center gap-1 border-b border-border overflow-x-auto",
                className
            )}
        >
            {tabs.map((tab) => {
                const active = tab.value === value
                const Icon = tab.icon
                return (
                    <button
                        key={tab.value}
                        role="tab"
                        aria-selected={active}
                        onClick={() => { onChange(tab.value); }}
                        className={cn(
                            "relative flex items-center gap-1.5 px-3 py-2.5 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-t-md",
                            active
                                ? "text-foreground font-medium"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {Icon && <Icon className="size-3.5" />}
                        {tab.label}
                        {tab.count !== undefined && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {tab.count}
                            </span>
                        )}
                        {active && (
                            <motion.div
                                layoutId={layoutId}
                                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-brand"
                                transition={EASE.spring}
                            />
                        )}
                    </button>
                )
            })}
        </div>
    )
}
