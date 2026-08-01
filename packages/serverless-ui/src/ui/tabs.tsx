import type * as React from 'react'

import { Tabs as TabsPrimitive } from 'radix-ui'

import { cn } from '../lib/cn'

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-5', className)}
      {...props}
    />
  )
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        // Underline tabs rather than a pill group: this is page-level
        // navigation, and it needs to read as part of the page chrome.
        'border-border/60 flex w-full items-center gap-1 overflow-x-auto border-b',
        className,
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 relative inline-flex items-center gap-1.5 rounded-t-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2',
        "data-[state=active]:text-foreground data-[state=active]:after:bg-brand-gold data-[state=active]:after:absolute data-[state=active]:after:inset-x-2 data-[state=active]:after:-bottom-px data-[state=active]:after:h-0.5 data-[state=active]:after:rounded-full data-[state=active]:after:content-['']",
        '[&_svg]:size-4 [&_svg]:shrink-0',
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('animate-content-enter outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
