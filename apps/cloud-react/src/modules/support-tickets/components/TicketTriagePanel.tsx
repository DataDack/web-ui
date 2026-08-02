import { useState } from "react"

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@datadack/common-ui"
import { useTranslation } from "react-i18next"

import { Section } from "@/components/console"
import { TICKET_PRIORITIES, TICKET_STATUSES } from "../support-tickets.constants"
import type { SupportTicket, UpdateTicketPayload } from "../support-tickets.types"

// TicketTriagePanel is the staff status / priority / assignee editor. It posts a
// partial UpdateTicketPayload; the backend route is admin-gated regardless. Shared
// by the customer console (admin-role staff) and the super-admin panel.
export function TicketTriagePanel({
  ticket,
  updating,
  onSave,
}: Readonly<{
  ticket: SupportTicket
  updating: boolean
  onSave: (vars: { id: string; payload: UpdateTicketPayload }) => void
}>) {
  const { t } = useTranslation()
  const [status, setStatus] = useState(ticket.status)
  const [priority, setPriority] = useState(ticket.priority)
  const [assignee, setAssignee] = useState(ticket.assignedTo ?? "")

  const dirty =
    status !== ticket.status ||
    priority !== ticket.priority ||
    assignee !== (ticket.assignedTo ?? "")

  return (
    <Section variant="panel" title={t("supportTickets.detail.triage")}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">
            {t("supportTickets.columns.status")}
          </Label>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as typeof status)
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TICKET_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`status.${s}`, { defaultValue: s })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">
            {t("supportTickets.columns.priority")}
          </Label>
          <Select
            value={priority}
            onValueChange={(v) => {
              setPriority(v as typeof priority)
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TICKET_PRIORITIES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {t(p.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">
            {t("supportTickets.detail.assignee")}
          </Label>
          <Input
            value={assignee}
            onChange={(e) => {
              setAssignee(e.target.value)
            }}
            placeholder={t("supportTickets.detail.assigneePlaceholder")}
            className="font-mono text-xs"
          />
          {ticket.assignedTo && (ticket.assignedToName ?? ticket.assignedToEmail) && (
            <p className="text-xs text-muted-foreground">
              {ticket.assignedToName ?? ticket.assignedToEmail}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          variant="gold"
          disabled={updating || !dirty}
          onClick={() => {
            onSave({
              id: ticket.id,
              payload: { status, priority, assignedTo: assignee.trim() },
            })
          }}
        >
          {updating ? t("common.loading") : t("supportTickets.detail.saveTriage")}
        </Button>
      </div>
    </Section>
  )
}
