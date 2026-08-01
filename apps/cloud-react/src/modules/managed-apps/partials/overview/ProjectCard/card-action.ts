// The single next step a card offers, resolved from the derived state.
//
// `state.action` says what to offer but not where it goes — it is shared with
// surfaces that route the same intent differently — so the mapping to a
// destination lives beside the surface that owns the click.

import { MANAGED_APPS_ROUTES } from "../../../managed-apps.constants"
import type { ProjectState } from "../../../managed-apps.state"
import type { Project } from "../../../managed-apps.types"

export type CardAction =
    | { kind: "deploy"; label: string }
    | { kind: "reconnect"; label: string }
    | { kind: "internal"; label: string; to: string }
    | { kind: "external"; label: string; href: string }
    | null

export function cardAction(project: Project, state: ProjectState): CardAction {
    const builds = `${MANAGED_APPS_ROUTES.project(project.id)}?tab=builds`
    switch (state.kind) {
        case "source_disconnected":
            return { kind: "reconnect", label: "Reconnect GitHub" }
        case "awaiting_setup":
            // The pull request itself when GitHub gave us a URL, otherwise the
            // setup page, which explains the retry and shows GitHub's own words.
            return state.action?.href
                ? { kind: "external", label: "Review pull request", href: state.action.href }
                : {
                      kind: "internal",
                      label: state.action?.label ?? "Finish setup",
                      to: MANAGED_APPS_ROUTES.setup(project.id),
                  }
        case "awaiting_build":
            return { kind: "deploy", label: "Deploy now" }
        case "built_pending_deploy":
            // "Rebuild", not "Redeploy": this enqueues a build, and with no runtime
            // container attached there is nothing to redeploy onto.
            return { kind: "deploy", label: "Rebuild" }
        case "failed":
            return { kind: "internal", label: "View failure", to: builds }
        case "building":
        case "deploying":
            return { kind: "internal", label: "View log", to: builds }
        case "live":
            return project.url ? { kind: "external", label: "Visit site", href: project.url } : null
        // deleting, no_pipeline and unknown have nothing a user can usefully do
        // from here, and a disabled button is not an answer.
        default:
            return null
    }
}
