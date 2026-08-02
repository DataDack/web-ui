import { useMemo, useState } from "react"

import { Button, Checkbox, Skeleton, Textarea } from "@datadack/common-ui"
import { ArrowLeft, LifeBuoy, Send, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

import {
  ConfirmDialog,
  KeyValueGrid,
  type KeyValueItem,
  PageHeader,
  Section,
  StatusBadge,
} from "@/components/console"
import { PriorityBadge } from "@/modules/support-tickets/components/PriorityBadge"
import {
  formatTicketAccount,
  formatTicketDateTime,
  formatTicketPerson,
} from "@/modules/support-tickets/components/ticket-format"
import { TicketThread } from "@/modules/support-tickets/components/TicketThread"
import { TicketTriagePanel } from "@/modules/support-tickets/components/TicketTriagePanel"
import { categoryLabelKey } from "@/modules/support-tickets/support-tickets.constants"
import {
  useAddSupportTicketComment,
  useDeleteSupportTicket,
  useSupportTicket$,
  useSupportTicketComments$,
  useUpdateSupportTicket,
} from "@/modules/support-tickets/support-tickets.hooks"
import { useScreen } from "@/services/api/screen"

const ADMIN_SUPPORT_ROOT = "/admin/support"

// Super-admin ticket detail: full triage + thread. The admin panel is gated by
// RequireSuperAdmin, so triage is always available here (no per-user check).
export function AdminSupportTicketDetailPage() {
  useScreen("superadmin.admin-support-ticket-detail")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = "" } = useParams()

  const { data: ticket, isLoading, isError, refetch } = useSupportTicket$(id)
  const { data: comments = [], isLoading: commentsLoading } = useSupportTicketComments$(id)
  const { mutate: addComment, isPending: replying } = useAddSupportTicketComment()
  const { mutate: updateTicket, isPending: updating } = useUpdateSupportTicket()
  const { mutate: deleteTicket } = useDeleteSupportTicket()

  const [reply, setReply] = useState("")
  const [internal, setInternal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const meta = useMemo<KeyValueItem[]>(() => {
    if (!ticket) return []
    return [
      {
        label: t("supportTickets.columns.category"),
        value: t(categoryLabelKey(ticket.category)),
      },
      {
        label: t("supportTickets.detail.account"),
        value: formatTicketAccount(ticket.accountName, ticket.accountNumber),
      },
      {
        label: t("supportTickets.detail.requester"),
        value: formatTicketPerson(ticket.createdBy, ticket.createdByName, ticket.createdByEmail),
      },
      {
        label: t("supportTickets.detail.assignee"),
        value: ticket.assignedTo
          ? formatTicketPerson(ticket.assignedTo, ticket.assignedToName, ticket.assignedToEmail)
          : t("supportTickets.detail.unassigned"),
      },
      { label: t("common.created"), value: formatTicketDateTime(ticket.createdAt) },
      { label: t("common.updated"), value: formatTicketDateTime(ticket.updatedAt) },
      { label: t("supportTickets.detail.ticketId"), value: ticket.id, copyable: true },
    ]
  }, [ticket, t])

  if (isError) {
    return (
      <div className="max-w-3xl space-y-4 py-10 text-center">
        <p className="font-medium text-destructive">{t("common.error")}</p>
        <Button variant="ghost" size="sm" onClick={() => void refetch()}>
          {t("common.retry")}
        </Button>
      </div>
    )
  }

  if (isLoading || !ticket) {
    return (
      <div className="max-w-3xl space-y-4 py-2">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  const submitReply = () => {
    const body = reply.trim()
    if (!body) return
    addComment(
      { id, payload: { body, isInternal: internal } },
      {
        onSuccess: () => {
          setReply("")
          setInternal(false)
        },
      },
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        icon={LifeBuoy}
        breadcrumbs={[
          { label: t("superAdmin.title") },
          { label: t("superAdmin.support.title"), to: ADMIN_SUPPORT_ROOT },
          { label: ticket.subject },
        ]}
        title={ticket.subject}
        meta={
          <>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </>
        }
        actions={
          <>
            <Button
              variant="ghost"
              className="gap-2"
              onClick={() => void navigate(ADMIN_SUPPORT_ROOT)}
            >
              <ArrowLeft className="w-4 h-4" />
              {t("superAdmin.support.title")}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              title={t("supportTickets.detail.delete")}
              onClick={() => {
                setConfirmDelete(true)
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        }
      />

      <Section variant="panel">
        <KeyValueGrid items={meta} columns={2} />
        <p className="mt-5 whitespace-pre-wrap text-sm text-foreground/90">
          {ticket.description || t("supportTickets.detail.noDescription")}
        </p>
      </Section>

      <TicketTriagePanel ticket={ticket} updating={updating} onSave={updateTicket} />

      <Section variant="panel" title={t("supportTickets.detail.conversation")}>
        <div className="space-y-4">
          <TicketThread loading={commentsLoading} comments={comments} />

          <div className="space-y-2 pt-2">
            <Textarea
              value={reply}
              onChange={(e) => {
                setReply(e.target.value)
              }}
              placeholder={t("supportTickets.detail.replyPlaceholder")}
              rows={3}
              className="resize-none"
            />
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={internal}
                  onCheckedChange={(v) => {
                    setInternal(v === true)
                  }}
                />
                {t("supportTickets.detail.internalNote")}
              </label>
              <Button
                variant="gold"
                className="gap-2"
                disabled={replying || !reply.trim()}
                onClick={submitReply}
              >
                <Send className="w-4 h-4" />
                {t("supportTickets.detail.send")}
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("supportTickets.detail.deleteTitle")}
        description={t("supportTickets.detail.deleteConfirm")}
        confirmLabel={t("supportTickets.detail.delete")}
        onConfirm={() => {
          deleteTicket(id, { onSuccess: () => void navigate(ADMIN_SUPPORT_ROOT) })
        }}
      />
    </div>
  )
}
