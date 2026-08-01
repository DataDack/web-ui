import { supportTicketsApi } from "./support-tickets.api"
import type {
    AddCommentPayload,
    CreateTicketPayload,
    UpdateTicketPayload,
} from "./support-tickets.types"

export const supportTicketsService = {
    fetchAll: () => supportTicketsApi.list(),
    fetchAllPlatform: () => supportTicketsApi.listAll(),
    fetchById: (id: string) => supportTicketsApi.get(id),
    fetchComments: (id: string) => supportTicketsApi.listComments(id),
    create: (payload: CreateTicketPayload) => supportTicketsApi.create(payload),
    update: (id: string, payload: UpdateTicketPayload) => supportTicketsApi.update(id, payload),
    addComment: (id: string, payload: AddCommentPayload) =>
        supportTicketsApi.addComment(id, payload),
    remove: (id: string) => supportTicketsApi.delete(id),
}
