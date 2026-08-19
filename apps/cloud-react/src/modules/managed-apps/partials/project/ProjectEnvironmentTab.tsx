import { EnvSection } from "./ProjectSettingsTab/EnvSection"
import type { Project } from "../../managed-apps.types"

/** Project-scoped build and preview environment variables. */
export function ProjectEnvironmentTab({ project }: Readonly<{ project: Project }>) {
  return <EnvSection project={project} />
}
