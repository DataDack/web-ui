import { useState } from "react"

import { cn } from "@datadack/common-ui"
import { Activity, Globe, ScrollText } from "lucide-react"

import { LogsSection } from "./LogsSection"
import { PlanUsagePanel } from "./PlanUsagePanel"
import type { Project } from "../managed-apps.types"
import { ProjectAnalyticsTab } from "../partials/project/ProjectAnalyticsTab"
import { ProjectResourcesSection } from "../partials/project/ProjectObservabilityTab"

const VIEWS = [
  { value: "traffic", label: "Traffic", icon: Globe },
  { value: "resources", label: "Resources", icon: Activity },
  { value: "logs", label: "Logs", icon: ScrollText },
] as const

/**
 * Observability — one page for everything measured about a running app.
 *
 * Analytics and Observability used to be two tabs, and the split did not
 * survive contact with the question people actually arrive with. "Analytics"
 * charted requests, bytes and status classes recorded by the gateway while
 * serving; "Observability" charted the container's CPU and memory. Both are
 * measurements of the same app taken at different layers — nobody investigating
 * a slow deploy thinks of one as marketing data and the other as engineering
 * data, and the tab strip made them look like different subjects.
 *
 * So: one page, three layers, in the order a problem is usually chased through
 * them — what the edge served, what the container spent doing it, and the
 * individual requests underneath both. The plan-usage tiles sit above all
 * three because they are the frame the rest is read inside.
 */
export function ProjectObservabilityPage({ project }: Readonly<{ project: Project }>) {
  const [view, setView] = useState<string>("traffic")
  const isN8n = project.project_type === "n8n"

  return (
    <div className="space-y-5">
      {!isN8n && <PlanUsagePanel project={project} />}

      <div className="flex items-center gap-0.5 rounded-lg border border-border-glass p-0.5 w-fit">
        {VIEWS.map((item) => {
          const Icon = item.icon
          const active = view === item.value
          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setView(item.value)
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                active
                  ? "glass-1-bg-raised text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {item.label}
            </button>
          )
        })}
      </div>

      {view === "traffic" && <ProjectAnalyticsTab project={project} />}
      {view === "resources" && <ProjectResourcesSection project={project} />}
      {view === "logs" && <LogsSection project={project} />}
    </div>
  )
}
