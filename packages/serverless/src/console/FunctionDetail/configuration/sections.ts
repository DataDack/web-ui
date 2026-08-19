import { Braces, Link2, Network, Settings2, Workflow, type LucideIcon } from "lucide-react"

export type ConfigurationSectionValue =
  | "general"
  | "env"
  | "triggers"
  | "layers"
  | "tags"
  | "concurrency"
  | "async"
  | "functionUrl"
  | "permissions"
  | "vpc"
  | "edge"

export interface ConfigurationSectionMeta {
  value: ConfigurationSectionValue
  /** No backend yet — rendered with a "Soon" chip and an honest panel. */
  soon: boolean
  icon: LucideIcon
}

/**
 * Nav order for the configuration sections.
 *
 * Its own module because two surfaces walk it now: the detail page's left rail,
 * which lists the sections alongside the tabs, and ConfigurationTab's built-in
 * nav for a host that renders the tab on its own.
 */
export const CONFIGURATION_SECTIONS: readonly ConfigurationSectionMeta[] = [
  { value: "general", soon: false, icon: Settings2 },
  { value: "env", soon: false, icon: Braces },
  { value: "functionUrl", soon: false, icon: Link2 },
  { value: "vpc", soon: true, icon: Network },
  { value: "edge", soon: true, icon: Workflow },
]
