import { Activity, Code2, GitBranch, History, Play, Settings2, type LucideIcon } from "lucide-react"

export type FunctionDetailTabValue =
  | "code"
  | "test"
  | "monitor"
  | "configuration"
  | "aliases"
  | "versions"

/**
 * The detail page's tabs, in Lambda's order: code first, then the tools you use
 * on a working function, configuration, and finally the routing/version
 * surfaces. Labels come from the labels object rather than this const, so a
 * console's translations flow through one place.
 */
export const FUNCTION_DETAIL_TABS: readonly { value: FunctionDetailTabValue; icon: LucideIcon }[] =
  [
    { value: "code", icon: Code2 },
    { value: "test", icon: Play },
    { value: "monitor", icon: Activity },
    { value: "configuration", icon: Settings2 },
    { value: "aliases", icon: GitBranch },
    { value: "versions", icon: History },
  ]
