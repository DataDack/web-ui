import {
    type LucideIcon,
    Activity,
    AppWindow,
    Boxes,
    Building2,
    Cpu,
    KeyRound,
    Network,
} from "lucide-react"

/** Registry modules in display order. Unknown modules from a newer backend are
 *  appended after these so the page never drops rows. */
export const MODULE_ORDER = [
    "compute",
    "vpc",
    "monitoring",
    "resourcegroup",
    "auth",
    "org",
    "managedapps",
] as const

export const MODULE_ICONS: Record<string, LucideIcon> = {
    compute: Cpu,
    vpc: Network,
    monitoring: Activity,
    resourcegroup: Boxes,
    auth: KeyRound,
    org: Building2,
    managedapps: AppWindow,
}
