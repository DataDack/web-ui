import {
    type LucideIcon,
    CreditCard,
    KeyRound,
    Lightbulb,
    MessageCircleQuestion,
    Siren,
    Sparkles,
    Wrench,
} from "lucide-react"

import type { StatusTone } from "@/components/console"

import type { TicketCategory, TicketPriority, TicketStatus } from "./support-tickets.types"

export const SUPPORT_ROUTES = {
    ROOT: "/support/tickets",
    CREATE: "/support/tickets/create",
    DETAIL: "/support/tickets/:id",
    detail: (id: string) => `/support/tickets/${id}`,
} as const

export const SUPPORT_QUERY_KEYS = {
    list: ["support-tickets", "list"] as const,
    listAll: ["support-tickets", "list-all"] as const,
    detail: (id: string) => ["support-tickets", "detail", id] as const,
    comments: (id: string) => ["support-tickets", "detail", id, "comments"] as const,
}

// ── Category catalog ────────────────────────────────────────────────────────
// Listed in resolve order (top = handled first). Each category seeds a default
// priority, mirroring constants.DefaultPriority on the backend so the create
// form can preview the priority a ticket will get.
export interface CategoryMeta {
    value: TicketCategory
    labelKey: string
    descKey: string
    icon: LucideIcon
    defaultPriority: TicketPriority
}

export const TICKET_CATEGORIES: CategoryMeta[] = [
    {
        value: "outage",
        labelKey: "supportTickets.category.outage",
        descKey: "supportTickets.categoryDesc.outage",
        icon: Siren,
        defaultPriority: "critical",
    },
    {
        value: "technical",
        labelKey: "supportTickets.category.technical",
        descKey: "supportTickets.categoryDesc.technical",
        icon: Wrench,
        defaultPriority: "high",
    },
    {
        value: "billing",
        labelKey: "supportTickets.category.billing",
        descKey: "supportTickets.categoryDesc.billing",
        icon: CreditCard,
        defaultPriority: "high",
    },
    {
        value: "account",
        labelKey: "supportTickets.category.account",
        descKey: "supportTickets.categoryDesc.account",
        icon: KeyRound,
        defaultPriority: "medium",
    },
    {
        value: "general",
        labelKey: "supportTickets.category.general",
        descKey: "supportTickets.categoryDesc.general",
        icon: MessageCircleQuestion,
        defaultPriority: "low",
    },
    {
        value: "consultant",
        labelKey: "supportTickets.category.consultant",
        descKey: "supportTickets.categoryDesc.consultant",
        icon: Lightbulb,
        defaultPriority: "scheduled",
    },
    {
        value: "feature",
        labelKey: "supportTickets.category.feature",
        descKey: "supportTickets.categoryDesc.feature",
        icon: Sparkles,
        defaultPriority: "backlog",
    },
]

export function categoryLabelKey(category: TicketCategory): string {
    return TICKET_CATEGORIES.find((c) => c.value === category)?.labelKey ?? category
}

export function defaultPriorityForCategory(category: TicketCategory): TicketPriority {
    return TICKET_CATEGORIES.find((c) => c.value === category)?.defaultPriority ?? "medium"
}

// ── Priority catalog ────────────────────────────────────────────────────────
// rank mirrors constants.PriorityRank on the backend (0 = resolve first); used
// to sort the queue client-side after a refetch.
export interface PriorityMeta {
    value: TicketPriority
    labelKey: string
    tone: StatusTone
    rank: number
}

export const TICKET_PRIORITIES: PriorityMeta[] = [
    { value: "critical", labelKey: "supportTickets.priority.critical", tone: "danger", rank: 0 },
    { value: "high", labelKey: "supportTickets.priority.high", tone: "warning", rank: 1 },
    { value: "medium", labelKey: "supportTickets.priority.medium", tone: "info", rank: 2 },
    { value: "low", labelKey: "supportTickets.priority.low", tone: "neutral", rank: 3 },
    { value: "scheduled", labelKey: "supportTickets.priority.scheduled", tone: "info", rank: 4 },
    { value: "backlog", labelKey: "supportTickets.priority.backlog", tone: "neutral", rank: 5 },
]

export function priorityMeta(priority: TicketPriority): PriorityMeta {
    return (
        TICKET_PRIORITIES.find((p) => p.value === priority) ?? {
            value: priority,
            labelKey: priority,
            tone: "neutral",
            rank: 6,
        }
    )
}

// ── Status catalog ──────────────────────────────────────────────────────────
// Status strings match the backend; their badge tones live in the console's
// status-config (single source of truth for status colors).
export const TICKET_STATUSES: TicketStatus[] = [
    "open",
    "in_progress",
    "waiting_user",
    "resolved",
    "closed",
]
