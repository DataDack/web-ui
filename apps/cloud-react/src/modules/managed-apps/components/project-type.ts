import { type LucideIcon, AppWindow, Atom, Workflow } from "lucide-react"

import type { ProjectType } from "../managed-apps.types"

// No brand icons in lucide — generic glyphs stand in for each runtime,
// mirroring how monitoring renders Jira/Discord with generic icons.
// comingSoon types stay visible everywhere (sidebar, wizard, badges) but
// cannot be selected when creating a project.
export const PROJECT_TYPE_META: Record<
	ProjectType,
	{ label: string; icon: LucideIcon; comingSoon?: boolean }
> = {
	opennext: { label: "OpenNext", icon: AppWindow },
	react: { label: "React", icon: Atom },
	n8n: { label: "n8n Agent", icon: Workflow, comingSoon: true },
}

export function projectTypeLabel(type: ProjectType): string {
	return PROJECT_TYPE_META[type].label
}
