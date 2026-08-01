import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { extractError } from "@/services/api/client"

import { SUPPORT_QUERY_KEYS } from "./support-tickets.constants"
import { supportTicketsService } from "./support-tickets.service"
import type {
  AddCommentPayload,
  CreateTicketPayload,
  UpdateTicketPayload,
} from "./support-tickets.types"

export function useSupportTickets() {
  return useQuery({
    queryKey: SUPPORT_QUERY_KEYS.list,
    queryFn: supportTicketsService.fetchAll,
  })
}

// Platform-wide ticket queue for the super-admin panel (every account/org).
export function useAllSupportTickets() {
  return useQuery({
    queryKey: SUPPORT_QUERY_KEYS.listAll,
    queryFn: supportTicketsService.fetchAllPlatform,
  })
}

export function useSupportTicket$(id: string) {
  return useQuery({
    queryKey: SUPPORT_QUERY_KEYS.detail(id),
    queryFn: () => supportTicketsService.fetchById(id),
    enabled: !!id,
  })
}

export function useSupportTicketComments$(id: string) {
  return useQuery({
    queryKey: SUPPORT_QUERY_KEYS.comments(id),
    queryFn: () => supportTicketsService.fetchComments(id),
    enabled: !!id,
  })
}

export function useCreateSupportTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTicketPayload) => supportTicketsService.create(payload),
    onSuccess: (ticket) => {
      void queryClient.invalidateQueries({ queryKey: SUPPORT_QUERY_KEYS.list })
      void queryClient.invalidateQueries({ queryKey: SUPPORT_QUERY_KEYS.listAll })
      toast.success(`"${ticket.subject}" created`)
    },
    onError: (err: Error) => toast.error(extractError(err, "Failed to create ticket")),
  })
}

export function useUpdateSupportTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTicketPayload }) =>
      supportTicketsService.update(id, payload),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: SUPPORT_QUERY_KEYS.list })
      void queryClient.invalidateQueries({ queryKey: SUPPORT_QUERY_KEYS.listAll })
      void queryClient.invalidateQueries({ queryKey: SUPPORT_QUERY_KEYS.detail(id) })
      toast.success("Ticket updated")
    },
    onError: (err: Error) => toast.error(extractError(err, "Failed to update ticket")),
  })
}

export function useAddSupportTicketComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AddCommentPayload }) =>
      supportTicketsService.addComment(id, payload),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: SUPPORT_QUERY_KEYS.comments(id) })
      toast.success("Reply sent")
    },
    onError: (err: Error) => toast.error(extractError(err, "Failed to send reply")),
  })
}

export function useDeleteSupportTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => supportTicketsService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SUPPORT_QUERY_KEYS.list })
      void queryClient.invalidateQueries({ queryKey: SUPPORT_QUERY_KEYS.listAll })
      toast.success("Ticket deleted")
    },
    onError: (err: Error) => toast.error(extractError(err, "Failed to delete ticket")),
  })
}
