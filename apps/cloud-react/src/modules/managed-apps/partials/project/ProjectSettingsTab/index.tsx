import { BuildOutputSection } from "./BuildOutputSection"
import { DangerZone } from "./DangerZone"
import { GeneralSection } from "./GeneralSection"
import { GitSection } from "./GitSection"
import { PlanSection } from "./PlanSection"
import type { Project } from "../../../managed-apps.types"

/**
 * Settings — one section per concern, in the order a user reaches for them:
 * identity, then source, then how it builds, then the irreversible one, last
 * and visually separated. Environment variables have their own project tab.
 *
 * n8n instances have no repository and no build pipeline, so those sections are
 * absent rather than rendered empty.
 */
export function ProjectSettingsTab({ project }: Readonly<{ project: Project }>) {
  const isN8n = project.project_type === "n8n"

  return (
    <div className="space-y-5">
      <GeneralSection project={project} />
      <PlanSection />
      {!isN8n && <GitSection project={project} />}
      {!isN8n && <BuildOutputSection project={project} />}
      <DangerZone project={project} />
    </div>
  )
}
