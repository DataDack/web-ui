import { useMemo, useState } from "react"

import { ArrowLeft, LifeBuoy, Send } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

import {
  KeyValueGrid,
  type KeyValueItem,
  PageHeader,
  Section,
  StatusBadge,
} from "@/components/console"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useScreen } from "@/services/api/screen"

import { Skeleton } from "@datadack/common-ui"

import { PriorityBadge } from "../components/PriorityBadge"
import { formatTicketDateTime, formatTicketPerson } from "../components/ticket-format"
import { TicketThread } from "../components/TicketThread"
import { SUPPORT_ROUTES, categoryLabelKey } from "../support-tickets.constants"
import {
  useAddSupportTicketComment,
  useSupportTicket$,
  useSupportTicketComments$,
} from "../support-tickets.hooks"

// Customer-facing ticket detail: view the ticket and reply. Triage (status,
// priority, assignee, delete) lives ONLY in the super-admin panel
// (/admin/support) — never here, regardless of the viewer's role.
export function SupportTicketDetailPage() {
  useScreen("support-tickets.support-ticket-detail")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = "" } = useParams()

  const { data: ticket, isLoading, isError, refetch } = useSupportTicket$(id)
  const { data: comments = [], isLoading: commentsLoading } = useSupportTicketComments$(id)
  const { mutate: addComment, isPending: replying } = useAddSupportTicketComment()

  const [reply, setReply] = useState("")

  const meta = useMemo<KeyValueItem[]>(() => {
    if (!ticket) return []
    return [
      {
        label: t("supportTickets.columns.category"),
        value: t(categoryLabelKey(ticket.category)),
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
      <div className="space-y-4 px-5 py-10 text-center">
        <p className="font-medium text-destructive">{t("common.error")}</p>
        <Button variant="ghost" size="sm" onClick={() => void refetch()}>
          {t("common.retry")}
        </Button>
      </div>
    )
  }

  if (isLoading || !ticket) {
    return (
      <div className="space-y-4 px-5 py-8">
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
      { id, payload: { body, isInternal: false } },
      {
        onSuccess: () => {
          setReply("")
        },
      },
    )
  }

  return (
    <div className="space-y-6 px-5 py-2 lg:px-8">
      <PageHeader
        icon={LifeBuoy}
        breadcrumbs={[
          { label: t("console.nav.groups.support") },
          { label: t("supportTickets.title"), to: SUPPORT_ROUTES.ROOT },
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
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => void navigate(SUPPORT_ROUTES.ROOT)}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("supportTickets.title")}
          </Button>
        }
      />

      {/* Details on the left, conversation on the right. Stacks on small
                screens; on large ones details take a third and the chat the rest. */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Section variant="panel">
            <KeyValueGrid items={meta} columns={1} />
            <p className="mt-5 whitespace-pre-wrap text-sm text-foreground/90">
              {ticket.description || t("supportTickets.detail.noDescription")}
            </p>
          </Section>
        </div>

        <div className="lg:col-span-2">
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
                <div className="flex justify-end">
                  <Button
                    variant="gold"
                    className="gap-2"
                    disabled={replying || !reply.trim()}
                    onClick={submitReply}
                  >
                    <Send className="h-4 w-4" />
                    {t("supportTickets.detail.send")}
                  </Button>
                </div>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
