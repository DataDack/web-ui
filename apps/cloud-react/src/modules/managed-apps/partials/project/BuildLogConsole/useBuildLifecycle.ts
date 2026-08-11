import { buildLifecycle } from "./lifecycle"
import { useProject } from "../../../managed-apps.hooks"
import type { Build } from "../../../managed-apps.types"

/**
 * The lifecycle lines for one build, ready to spread onto <LogBody>.
 *
 * A hook rather than three props each caller assembles, because there are three
 * places a build log is rendered — the setup page, the log sheet and the latest-
 * build panel — and the version that made each of them compute this itself
 * ended up with one that did not. The result was a panel showing the runner's
 * output with no sign of when the build was queued, when a worker picked it up,
 * or that a deployment had started, while the panel next to it showed all of it.
 *
 * `useProject` is what supplies the branch and the build commands the lines
 * quote. It shares a query key with every other caller, so this costs no extra
 * request on a page that already loaded the project.
 */
export function useBuildLifecycle(build: Build | undefined) {
  const { data: project } = useProject(build?.project_id ?? "")
  const lifecycle = buildLifecycle(build, project)
  return {
    leading: lifecycle.leading,
    trailing: lifecycle.trailing,
    originIso: build?.created_at,
  }
}
