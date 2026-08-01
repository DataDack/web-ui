import type { ComponentType } from "react"

import { MessageSquare, Webhook } from "lucide-react"
import { SiJira } from "react-icons/si"

import type { AlertSeverity, ChannelType } from "../monitoring.types"

export const CHANNEL_TYPES: readonly ChannelType[] = ["discord", "jira", "webhook"]
export const SEVERITIES: readonly AlertSeverity[] = ["info", "warning", "critical"]

export const TYPE_META: Record<
    ChannelType,
    {
        label: string
        icon: ComponentType<{ className?: string }>
        badgeClass: string
        activeClass: string
    }
> = {
    discord: {
        label: "Discord",
        icon: MessageSquare,
        badgeClass: "border-indigo-500/40 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10",
        activeClass: "border-indigo-500/60 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    },
    jira: {
        label: "Jira",
        icon: SiJira,
        badgeClass: "border-[#0052CC]/40 text-[#0052CC] dark:text-[#579DFF] bg-[#0052CC]/10",
        activeClass: "border-[#0052CC] bg-[#0052CC] text-white hover:bg-[#0747A6]",
    },
    webhook: {
        label: "Webhook",
        icon: Webhook,
        badgeClass: "border-violet-500/40 text-violet-600 dark:text-violet-400 bg-violet-500/10",
        activeClass: "border-violet-500/60 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    },
}

export const SEVERITY_BADGE_CLASS: Record<AlertSeverity, string> = {
    info: "border-sky-500/40 text-sky-600 dark:text-sky-400 bg-sky-500/10",
    warning: "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10",
    critical: "border-red-500/40 text-red-600 dark:text-red-400 bg-red-500/10",
}
