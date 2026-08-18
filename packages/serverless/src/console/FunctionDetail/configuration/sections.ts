import {
  Braces,
  Gauge,
  Layers3,
  Link2,
  Network,
  Send,
  Settings2,
  ShieldCheck,
  Tags,
  Workflow,
  type LucideIcon,
} from "lucide-react"

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
  { value: "triggers", soon: false, icon: Workflow },
  { value: "layers", soon: false, icon: Layers3 },
  { value: "tags", soon: false, icon: Tags },
  { value: "concurrency", soon: false, icon: Gauge },
  { value: "async", soon: false, icon: Send },
  { value: "functionUrl", soon: false, icon: Link2 },
  { value: "permissions", soon: true, icon: ShieldCheck },
  { value: "vpc", soon: true, icon: Network },
]
