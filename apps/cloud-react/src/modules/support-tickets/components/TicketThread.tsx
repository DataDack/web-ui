import { Skeleton } from "@DataDack/common-ui"
import { Lock } from "lucide-react"
import { useTranslation } from "react-i18next"

import { formatTicketDateTime, formatTicketPerson } from "./ticket-format"
import type { TicketComment } from "../support-tickets.types"

// TicketThread renders a ticket's comment thread, or its loading / empty states.
// Shared by the customer console and the admin panel.
export function TicketThread({
  loading,
  comments,
}: Readonly<{ loading: boolean; comments: TicketComment[] }>) {
  const { t } = useTranslation()
  if (loading) return <Skeleton className="h-16 w-full" />
  if (comments.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("supportTickets.detail.noComments")}</p>
  }
  return (
    <>
      {comments.map((c) => (
        <div key={c.id} className="rounded-lg border border-border/60 bg-background/40 p-3">
          <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={c.authorName ? "font-medium text-foreground/80" : "font-mono"}
              title={c.authorEmail ?? c.authorId}
            >
              {formatTicketPerson(c.authorId, c.authorName, c.authorEmail)}
            </span>
            <span>·</span>
            <span>{formatTicketDateTime(c.createdAt)}</span>
            {c.isInternal && (
              <span className="inline-flex items-center gap-1 text-status-warning">
                <Lock className="size-3" />
                {t("supportTickets.detail.internalNote")}
              </span>
            )}
          </div>
          <p className="whitespace-pre-wrap text-sm text-foreground/90">{c.body}</p>
        </div>
      ))}
    </>
  )
}
