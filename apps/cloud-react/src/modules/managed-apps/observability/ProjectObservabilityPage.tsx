import { useEffect, useState } from "react"

import { LogsSection } from "./LogsSection"
import { PendingSection } from "./PendingSection"
import { PlanUsagePanel } from "./PlanUsagePanel"
import { RulesSection } from "./RulesSection"
import { SectionNav } from "./SectionNav"
import { defaultSectionFor, sectionByKey, type SectionTab } from "./sections"
import type { Project } from "../managed-apps.types"
import { ProjectAnalyticsTab } from "../partials/project/ProjectAnalyticsTab"
import { ProjectResourcesSection } from "../partials/project/ProjectObservabilityTab"

/**
 * One of the three measurement areas — Observability, Firewall or CDN — as a
 * rail of sections and the panel for the selected one.
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
 * groups. Seven carry a live meter and Rules shows the policy in force; the
 * rest are listed and say they are still being calculated. Listing them is
 * deliberate — see PendingSection.
 *
 * THE AREA IS THE PROJECT'S OWN TAB NOW, not a second strip inside this one.
 * Three areas nested under a fourth tab put two tab bars on the page, one above
 * the other, and made Firewall and CDN reachable only by first guessing that
 * they lived behind "Observability". They are top-level questions — is it up,
 * is something attacking it, is it being served fast — so they are top-level
 * tabs, and this component renders whichever one it is handed.
 */
/** Sections with a component of their own. Kept beside the switch below so the
 *  two cannot drift into rendering a panel and its placeholder together. */
const IMPLEMENTED = new Set(["overview", "resources", "logs", "rules"])

export function ProjectObservabilityPage({
  project,
  tab = "observability",
}: Readonly<{ project: Project; tab?: SectionTab }>) {
  const [active, setActive] = useState(() => defaultSectionFor(tab))
  const isN8n = project.project_type === "n8n"
  const section = sectionByKey(active)

  // The rail follows the tab. Each area owns a different set of section groups,
  // so a key selected under one is not in the other's rail at all — leaving it
  // would render a Firewall panel beside the CDN rail, with nothing in that rail
  // marked active. Keyed on the tab so it only runs when the area changes.
  useEffect(() => {
    setActive(defaultSectionFor(tab))
  }, [tab])

  return (
    <div className="space-y-5">
      {/* Plan usage heads the Observability area only. It is the account's
          monthly allowance for requests, bandwidth and build minutes — the
          subject of this area — and repeating it above Firewall and CDN would
          be the same four numbers on three tabs, none of which those two are
          about. */}
      {!isN8n && tab === "observability" && <PlanUsagePanel project={project} />}

      <div className="flex flex-col gap-5 lg:flex-row">
        <SectionNav tab={tab} active={active} onSelect={setActive} />

        <div className="min-w-0 flex-1">
          {/* The sections with their own implementations. Everything else is
              described by the section map and rendered by PendingSection, so
              adding a real one is a component plus a line in sections.ts. */}
          {active === "overview" && <ProjectAnalyticsTab project={project} />}
          {active === "resources" && <ProjectResourcesSection project={project} />}
          {active === "logs" && <LogsSection project={project} />}
          {active === "rules" && <RulesSection project={project} />}
          {!IMPLEMENTED.has(active) && section && <PendingSection section={section} />}
        </div>
      </div>
    </div>
  )
}
