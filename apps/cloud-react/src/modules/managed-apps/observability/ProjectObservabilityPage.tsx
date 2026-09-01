import { useState } from "react"

import { cn } from "@datadack/common-ui"

import { LogsSection } from "./LogsSection"
import { PendingSection } from "./PendingSection"
import { PlanUsagePanel } from "./PlanUsagePanel"
import { SectionNav } from "./SectionNav"
import { defaultSectionFor, sectionByKey, SECTION_TABS, type SectionTab } from "./sections"
import type { Project } from "../managed-apps.types"
import { ProjectAnalyticsTab } from "../partials/project/ProjectAnalyticsTab"
import { ProjectResourcesSection } from "../partials/project/ProjectObservabilityTab"

/**
 * Observability — one section for everything measured about a running app.
 *
 * Analytics and Observability used to be two tabs, and the split did not
 * survive contact with the question people arrive with. "Analytics" charted
 * requests, bytes and status classes recorded by the gateway while serving;
 * "Observability" charted the container's CPU and memory. Both are
 * measurements of the same app at different layers — nobody investigating a
 * slow deploy thinks of one as marketing data and the other as engineering
 * data, and the tab strip made them look like different subjects.
 *
 * What replaced it is a rail of seventeen sections in five groups, because the
 * platform sells about that many measurable things and they do fall into
 * groups. Nine have live meters today; the rest are listed and say they are
 * still being calculated. Listing them is deliberate — see PendingSection.
 */
export function ProjectObservabilityPage({ project }: Readonly<{ project: Project }>) {
  const [tab, setTab] = useState<SectionTab>("observability")
  const [active, setActive] = useState("overview")
  const isN8n = project.project_type === "n8n"
  const section = sectionByKey(active)

  // Changing tab moves the rail's selection with it, to that tab's first live
  // section. Leaving the old key selected would show a Firewall page under the
  // CDN tab — the rail and the content have to agree, and the tab is the one
  // the reader just acted on.
  const selectTab = (next: SectionTab) => {
    setTab(next)
    setActive(defaultSectionFor(next))
  }

  return (
    <div className="space-y-5">
      {!isN8n && <PlanUsagePanel project={project} />}

      <div
        role="tablist"
        aria-label="Observability areas"
        className="flex w-fit items-center gap-0.5 rounded-lg border border-border-glass p-0.5"
      >
        {SECTION_TABS.map((entry) => (
          <button
            key={entry.value}
            type="button"
            role="tab"
            aria-selected={tab === entry.value}
            onClick={() => {
              selectTab(entry.value)
            }}
            className={cn(
              "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              tab === entry.value
                ? "glass-1-bg-raised text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-5 lg:flex-row">
        <SectionNav tab={tab} active={active} onSelect={setActive} />

        <div className="min-w-0 flex-1">
          {/* The four sections with their own implementations. Everything else
              is described by the section map and rendered by PendingSection,
              so adding a real one is a component plus a line in sections.ts. */}
          {active === "overview" && <ProjectAnalyticsTab project={project} />}
          {active === "resources" && <ProjectResourcesSection project={project} />}
          {active === "logs" && <LogsSection project={project} />}
          {active !== "overview" && active !== "resources" && active !== "logs" && section && (
            <PendingSection section={section} />
          )}
        </div>
      </div>
    </div>
  )
}
