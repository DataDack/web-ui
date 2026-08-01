import { parseTags, type TagsInput } from "@/lib/tags"
import { apiDelete, apiGet, apiPost, apiPut, LIST_QUERY } from "@/services/api/client"

import { priorityMeta } from "./support-tickets.constants"
import type {
    AddCommentPayload,
    CreateTicketPayload,
    SupportTicket,
    TicketCategory,
    TicketComment,
    TicketPriority,
    TicketStatus,
    UpdateTicketPayload,
} from "./support-tickets.types"

/* ── Real backend wiring ───────────────────────────────────────────────────
 * App: support, module: tickets → base /support/tickets
 *   GET    /                list
 *   POST   /                create  (dto.CreateTicketRequest)
 *   GET    /:id             get
 *   PUT    /:id             update  (dto.UpdateTicketRequest, admin-only)
 *   DELETE /:id             delete  (admin-only)
 *   GET    /:id/comments    thread
 *   POST   /:id/comments    add comment (dto.AddCommentRequest)
 */

const BASE = "/support/tickets"

/** Raw shape returned by the Go dto.TicketView (entity + joined identities,
 *  snake_case). The *_name / *_number / *_email fields are omitted by the backend
 *  when empty, so they are all optional. */
interface TicketEntity {
    id: string
    subject: string
    description?: string
    category: string
    priority: string
    status: string
    account_id?: string
    account_name?: string
    account_number?: string
    created_by: string
    created_by_name?: string
    created_by_email?: string
    assigned_to?: string | null
    assigned_to_name?: string
    assigned_to_email?: string
    tags?: Exclude<TagsInput, undefined>
    created_at?: string
    updated_at?: string
}

interface CommentEntity {
    id: string
    ticket_id: string
    author_id: string
    author_name?: string
    author_email?: string
    body: string
    is_internal?: boolean
    created_at?: string
}

function serializeTags(tags?: Record<string, string>): string {
    return JSON.stringify(tags ?? {})
}

function toTicket(e: TicketEntity): SupportTicket {
    return {
        id: e.id,
        subject: e.subject,
        description: e.description ?? "",
        category: e.category as TicketCategory,
        priority: e.priority as TicketPriority,
        status: e.status as TicketStatus,
        accountId: e.account_id ?? undefined,
        accountName: e.account_name ?? undefined,
        accountNumber: e.account_number ?? undefined,
        createdBy: e.created_by,
        createdByName: e.created_by_name ?? undefined,
        createdByEmail: e.created_by_email ?? undefined,
        // OptionalUUID serializes to null when unset; surface as undefined.
        assignedTo: e.assigned_to ?? undefined,
        assignedToName: e.assigned_to_name ?? undefined,
        assignedToEmail: e.assigned_to_email ?? undefined,
        tags: parseTags(e.tags),
        createdAt: e.created_at ?? "",
        updatedAt: e.updated_at ?? "",
    }
}

function toComment(e: CommentEntity): TicketComment {
    return {
        id: e.id,
        ticketId: e.ticket_id,
        authorId: e.author_id,
        authorName: e.author_name ?? undefined,
        authorEmail: e.author_email ?? undefined,
        body: e.body,
        isInternal: e.is_internal ?? false,
        createdAt: e.created_at ?? "",
    }
}

/** The backend already orders by priority then age; re-sort defensively so the
 *  client never depends on row order surviving the transport. */
function byTriageOrder(a: SupportTicket, b: SupportTicket): number {
    const rank = priorityMeta(a.priority).rank - priorityMeta(b.priority).rank
    if (rank !== 0) return rank
    return a.createdAt.localeCompare(b.createdAt)
}

export const supportTicketsApi = {
    list: async (): Promise<SupportTicket[]> => {
        const items = await apiGet<TicketEntity[]>(BASE + LIST_QUERY)
        return items.map(toTicket).sort(byTriageOrder)
    },

    // Platform-wide queue across every account/org — super-admin only on the
    // backend (GET /support/tickets/all, SuperAdminRequired).
    listAll: async (): Promise<SupportTicket[]> => {
        const items = await apiGet<TicketEntity[]>(`${BASE}/all${LIST_QUERY}`)
        return items.map(toTicket).sort(byTriageOrder)
    },

    get: async (id: string): Promise<SupportTicket> => {
        const item = await apiGet<TicketEntity>(`${BASE}/${id}`)
        return toTicket(item)
    },

    listComments: async (id: string): Promise<TicketComment[]> => {
        const items = await apiGet<CommentEntity[]>(`${BASE}/${id}/comments`)
        return items.map(toComment)
    },

    create: async (payload: CreateTicketPayload): Promise<SupportTicket> => {
        const body: Record<string, unknown> = {
            subject: payload.subject,
            description: payload.description,
            category: payload.category,
            tags: serializeTags(payload.tags),
        }
        if (payload.priority) body.priority = payload.priority
        const item = await apiPost<TicketEntity>(BASE, body)
        return toTicket(item)
    },

    update: async (id: string, payload: UpdateTicketPayload): Promise<SupportTicket> => {
        const body: Record<string, unknown> = {}
        if (payload.subject !== undefined) body.subject = payload.subject
        if (payload.description !== undefined) body.description = payload.description
        if (payload.category !== undefined) body.category = payload.category
        if (payload.priority !== undefined) body.priority = payload.priority
        if (payload.status !== undefined) body.status = payload.status
        if (payload.assignedTo !== undefined) body.assigned_to = payload.assignedTo
        if (payload.tags !== undefined) body.tags = serializeTags(payload.tags)
        const item = await apiPut<TicketEntity>(`${BASE}/${id}`, body)
        return toTicket(item)
    },

    addComment: async (id: string, payload: AddCommentPayload): Promise<TicketComment> => {
        const item = await apiPost<CommentEntity>(`${BASE}/${id}/comments`, {
            body: payload.body,
            is_internal: payload.isInternal ?? false,
        })
        return toComment(item)
    },

    delete: async (id: string): Promise<void> => {
        await apiDelete(`${BASE}/${id}`)
    },
}
