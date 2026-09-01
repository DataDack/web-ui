import { type LucideIcon, AppWindow, Atom, Workflow } from "lucide-react"
import type { IconType } from "react-icons"

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

/**
 * The framework's own mark, for the places where a logo says what it is faster
 * than a word does — the project tile in the list, the type cards in the
 * wizard. Lucide has no brand icons, so these come from react-icons; the lucide
 * glyphs above stay for the slots that need a `LucideIcon` (empty states,
 * sidebar), which cannot take these.
 *
 * Marks themselves live in `framework-marks.ts`, keyed by CATALOGUE framework
 * id. They are deliberately not keyed by `ProjectType`: that field only
 * distinguishes OpenNext from "react", so a map keyed on it painted the React
 * atom onto every Vue, Astro, Hugo and SvelteKit project in the console.
 */
export interface FrameworkMark {
  icon: IconType
  /** Official brand colour. */
  color: string
  /** Dark-theme override, set only where the official mark is near-black. */
  colorDark?: string
}
