import { Braces, Layers3, Network, Settings2, Tags, type LucideIcon } from "lucide-react"

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
  | "network"

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
  { value: "layers", soon: false, icon: Layers3 },
  { value: "tags", soon: false, icon: Tags },
  { value: "network", soon: false, icon: Network },
]
