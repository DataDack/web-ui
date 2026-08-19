import { Gauge, Network, Settings2, type LucideIcon } from "lucide-react"

import type { ConfigurationSectionValue } from "./sections"

export type ConfigurationGroupValue = "general" | "networking" | "runtime"

export interface ConfigurationGroupMeta {
  value: ConfigurationGroupValue
  icon: LucideIcon
  /**
   * The sections this screen stacks, in render order. The first is the group's
   * identity in the URL: selecting the tab reports it through
   * onSectionChange, so `?section=` keeps meaning one destination.
   */
  sections: readonly ConfigurationSectionValue[]
}

/**
 * The three Configuration screens.
 *
 * Ten sections meant ten near-empty pages — Asynchronous invocation was a whole
 * screen for two fields, Function URL a whole screen for one sentence. Grouping
 * them by the question they answer (what is this function, how do requests
 * reach it, what does it get to run with) turns ten sparse pages into three
 * dense ones, and turns the rail's ten rows into one.
 */
export const CONFIGURATION_GROUPS: readonly ConfigurationGroupMeta[] = [
  { value: "general", icon: Settings2, sections: ["general", "env", "tags"] },
  { value: "networking", icon: Network, sections: ["functionUrl", "triggers", "vpc"] },
  { value: "runtime", icon: Gauge, sections: ["concurrency", "async", "layers", "permissions"] },
]

/** Which screen a section lives on. Unknown sections fall back to General. */
export function groupOfSection(section: ConfigurationSectionValue): ConfigurationGroupValue {
  return (
    CONFIGURATION_GROUPS.find((group) => group.sections.includes(section))?.value ?? "general"
  )
}
