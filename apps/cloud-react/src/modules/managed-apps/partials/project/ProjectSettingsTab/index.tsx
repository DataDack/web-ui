import { AnimatePresence, motion } from "motion/react"
import { useSearchParams } from "react-router-dom"

import { DUR, EASE } from "@/components/console"

import { BuildOutputSection } from "./BuildOutputSection"
import { DangerZone } from "./DangerZone"
import { EnvironmentsSection } from "./EnvironmentsSection"
import { EnvSection } from "./EnvSection"
import { GeneralSection } from "./GeneralSection"
import { GitSection } from "./GitSection"
import { PlanSection } from "./PlanSection"
import {
  resolveSection,
  sectionsFor,
  SETTINGS_SECTIONS_PARAM,
  type SettingsSectionId,
} from "./settings-sections"
import { SettingsRail } from "./SettingsRail"
import { isSourceConnected, type Project } from "../../../managed-apps.types"

/**
 * Settings — a rail, and one section at a time.
 *
 * The five concerns used to render as five identical full-width panels stacked
 * down the page. That gave the reader no map, no hierarchy between "rename this"
 * and "delete this", and no room to grow: notifications, transfer and deploy
 * protection all land here eventually, and a flat stack was already at its
 * limit at five.
 *
 * So the rail owns navigation and each section owns its own view. Only the
 * chosen section mounts, which is what keeps a page about a branch name from
 * also being a page about deletion.
 *
 * The choice lives in `?section=` beside the tab's own `?tab=`, so a link to
 * "this project's build settings" is a real link, and Back returns to the
 * section the reader left rather than to the top of a scroll.
 *
 * n8n instances have no repository and no build pipeline, so those two entries
 * are absent from the rail rather than present and empty.
 */
export function ProjectSettingsTab({ project }: Readonly<{ project: Project }>) {
  const [searchParams, setSearchParams] = useSearchParams()
  const sections = sectionsFor(project)
  const active = resolveSection(project, searchParams.get(SETTINGS_SECTIONS_PARAM))

  const select = (id: SettingsSectionId) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        // The first section is the default view; keeping it out of the URL
        // means the plain ?tab=settings link stays the plain one.
        if (id === sections[0].id) next.delete(SETTINGS_SECTIONS_PARAM)
        else next.set(SETTINGS_SECTIONS_PARAM, id)
        return next
      },
      { replace: true },
    )
  }

  // Counted here rather than inside the build section because the rail shows it
  // too — it is how a reader knows this project departs from the defaults
  // without opening the section.
  const buildOverrides = [
    project.root_dir,
    project.install_command,
    project.build_command,
    project.output_dir,
    project.node_version,
  ].filter((field) => field !== "").length

  return (
    <div className="grid gap-4 lg:grid-cols-[184px_minmax(0,1fr)] lg:gap-6">
      <SettingsRail
        projectId={project.id}
        sections={sections}
        active={active}
        onSelect={select}
        buildOverrides={buildOverrides}
        // One dot, on the section that can fix it. A disconnected project shows
        // its state in three places already — the header chip, the overview
        // list, the Git panel — and the rail's job is only to get the reader to
        // the one screen with the Reconnect button on it.
        attention={{ git: !isSourceConnected(project.source_state) }}
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: DUR.fast, ease: EASE.out }}
          className="min-w-0"
        >
          {active === "general" && <GeneralSection project={project} />}
          {active === "git" && <GitSection project={project} />}
          {active === "build" && (
            <BuildOutputSection project={project} overrideCount={buildOverrides} />
          )}
          {active === "environments" && <EnvironmentsSection project={project} />}
          {active === "environment-variables" && <EnvSection project={project} />}
          {active === "plan" && <PlanSection />}
          {active === "danger" && <DangerZone project={project} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
