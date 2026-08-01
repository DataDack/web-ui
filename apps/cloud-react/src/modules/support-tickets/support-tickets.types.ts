// Mirrors the Go support module (apps/support/tickets/entity).

// The required classification a customer picks when filing a ticket. It seeds
// the ticket's default priority, which orders the triage queue.
export type TicketCategory =
    "outage" | "technical" | "billing" | "account" | "general" | "consultant" | "feature"

// Urgency, highest first. Drives the "resolve this next" queue order.
export type TicketPriority = "critical" | "high" | "medium" | "low" | "scheduled" | "backlog"

// Lifecycle of a ticket.
export type TicketStatus = "open" | "in_progress" | "waiting_user" | "resolved" | "closed"

export interface SupportTicket {
    id: string
    subject: string
    description: string
    category: TicketCategory
    priority: TicketPriority
    status: TicketStatus
    // Owning account. The backend joins its name/number onto the response so the
    // admin queue can label the tenant without a second lookup.
    accountId?: string
    accountName?: string
    accountNumber?: string
    createdBy: string
    // Human identity of the filer, joined by the backend (empty when the user was
    // deleted). Prefer these over the raw createdBy UUID in the UI.
    createdByName?: string
    createdByEmail?: string
    // Support agent the ticket is assigned to; undefined until triaged (the
    // backend OptionalUUID serializes to null when unset). Name/email are joined
    // alongside for display.
    assignedTo?: string
    assignedToName?: string
    assignedToEmail?: string
    tags: Record<string, string>
    createdAt: string
    updatedAt: string
}

export interface TicketComment {
    id: string
    ticketId: string
    authorId: string
    // Human identity of the author, joined by the backend for thread labels.
    authorName?: string
    authorEmail?: string
    body: string
    // Staff-only note — never returned to the customer who filed the ticket.
    isInternal: boolean
    createdAt: string
}

// Create maps to dto.CreateTicketRequest. Priority is optional — when omitted
// the backend derives it from the category.
export interface CreateTicketPayload {
    subject: string
    description: string
    category: TicketCategory
    priority?: TicketPriority
    tags?: Record<string, string>
}

// Update maps to dto.UpdateTicketRequest (triage; admin-only on the backend).
// assignedTo === "" clears the assignment.
export interface UpdateTicketPayload {
    subject?: string
    description?: string
    category?: TicketCategory
    priority?: TicketPriority
    status?: TicketStatus
    assignedTo?: string
    tags?: Record<string, string>
}

export interface AddCommentPayload {
    body: string
    isInternal?: boolean
}
