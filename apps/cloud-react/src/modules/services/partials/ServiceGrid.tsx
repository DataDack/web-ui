import { LayoutGrid } from "lucide-react"

import { staggerDelay } from "@/components/console"
import { Skeleton } from "@/components/ui/skeleton"

import { useServices } from "../services.hooks"
import { ServiceCard } from "./ServiceCard"

export function ServiceGrid() {
  const services = useServices()
  const isLoading = services.length === 0

  return (
    <section>
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="font-bold text-headline-lg text-foreground flex items-center gap-2">
            <LayoutGrid className="w-6 h-6" />
            Sovereign Services
          </h2>
          <p className="text-body-md text-on-surface-variant mt-1">
            Manage infrastructure across your isolated domains.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-2 p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-11 h-11 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-5 w-20 rounded-md" />
                </div>
              </div>
            ))
          : services.map((svc, index) => (
              <div
                key={svc.id}
                className="animate-content-enter *:h-full"
                style={staggerDelay(index)}
              >
                <ServiceCard service={svc} />
              </div>
            ))}
      </div>
    </section>
  )
}
