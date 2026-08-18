import { cn, Tabs, TabsList, TabsTrigger } from "@datadack/common-ui"
import type { LucideIcon } from "lucide-react"

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

export function AnimatedTabs({
  tabs,
  value,
  onChange,
  className,
}: Readonly<AnimatedTabsProps>) {
  return (
    <Tabs value={value} onValueChange={onChange} className={cn("gap-0", className)}>
      <TabsList>
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="gap-1.5 px-3 py-2.5"
          >
            {Icon && <Icon className="size-3.5" />}
            {tab.label}
            {tab.count !== undefined && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                {tab.count}
              </span>
            )}
          </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}
