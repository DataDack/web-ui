import { useMemo, useState } from "react"

import {
  actionsColumn,
  Badge,
  Button,
  Card,
  CardContent,
  DataTable,
  dateColumn,
  EmptyState,
  Textarea,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { List, Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"

import { PageHeader } from "@/components/console"

import { useAddIPSetEntries, useIPSet, useRemoveIPSetEntry } from "../vpc.hooks"
import type { IpSetEntry } from "../vpc.types"

/** One CIDR per line, with an optional trailing comment after whitespace.
 *  Parsing here rather than server-side keeps the paste box forgiving: blank
 *  lines and stray whitespace are dropped instead of being sent and rejected. */
function parseEntries(raw: string): { cidr: string; comment?: string }[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [cidr, ...rest] = line.split(/\s+/)
      const comment = rest.join(" ").trim()
      return comment ? { cidr, comment } : { cidr }
    })
}

export function IPSetDetailPage() {
  const { t } = useTranslation()
  const { id = "" } = useParams()
  const { data: set, isLoading } = useIPSet(id)
  const { mutate: addEntries, isPending: isAdding } = useAddIPSetEntries()
  const { mutate: removeEntry } = useRemoveIPSetEntry()
  const [draft, setDraft] = useState("")

  const entries = set?.entries ?? []

  const columns = useMemo<ColumnDef<IpSetEntry>[]>(
    () => [
      {
        id: "cidr",
        accessorFn: (e: IpSetEntry) => e.cidr,
        header: () => t("ipSets.detail.cidr"),
        cell: ({ row }) => <span className="font-mono text-[13px]">{row.original.cidr}</span>,
      },
      {
        id: "comment",
        accessorFn: (e: IpSetEntry) => e.comment,
        header: () => t("ipSets.detail.comment"),
        meta: { responsive: "md" },
        cell: ({ row }) => (
          <span className="text-[13px] text-muted-foreground">{row.original.comment}</span>
        ),
      },
      dateColumn<IpSetEntry>({
        header: t("common.created"),
        accessor: (e) => e.created_at,
        responsive: "lg",
      }),
      actionsColumn<IpSetEntry>({
        ariaLabel: t("console.table.actions"),
        actions: () => [
          {
            label: t("ipSets.detail.removeEntry"),
            icon: Trash2,
            destructive: true,
            onAction: (row) => {
              removeEntry({ id, entryId: row.id })
            },
          },
        ],
      }),
    ],
    [t, id, removeEntry],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={List}
        breadcrumbs={[
          { label: t("console.nav.groups.networking") },
          { label: t("ipSets.title"), to: "/networking/ip-sets" },
          { label: set?.name ?? "" },
        ]}
        title={set?.name ?? ""}
        description={set?.description}
        actions={
          set ? (
            <Badge variant="outline" className="font-mono text-[11px]">
              {set.ip_version}
            </Badge>
          ) : null
        }
      />

      <Card>
        <CardContent className="space-y-3 pt-5">
          <Textarea
            rows={4}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
            }}
            placeholder={t("ipSets.detail.bulkPlaceholder")}
            aria-label={t("ipSets.detail.addEntries")}
            className="font-mono text-[13px]"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] text-muted-foreground">{t("ipSets.detail.bulkHint")}</p>
            <Button
              className="gap-2 shrink-0"
              disabled={isAdding || parseEntries(draft).length === 0}
              onClick={() => {
                addEntries(
                  { id, entries: parseEntries(draft) },
                  { onSuccess: () => { setDraft("") } },
                )
              }}
            >
              <Plus className="w-4 h-4" />
              {t("ipSets.detail.addEntries")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!isLoading && entries.length === 0 ? (
        <EmptyState
          icon={List}
          title={t("ipSets.detail.entries")}
          description={t("ipSets.detail.entriesEmpty")}
        />
      ) : (
        <DataTable<IpSetEntry> data={entries} columns={columns} loading={isLoading} />
      )}
    </div>
  )
}
