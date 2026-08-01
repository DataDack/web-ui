import { useMemo, useState } from 'react'

import type { ColumnDef } from '@tanstack/react-table'
import { ScrollText, ShieldCheck, ShieldX, UserCheck } from 'lucide-react'

import { apiErrorMessage } from '@/lib/api'
import { useAuditEvents } from '@/lib/queries'
import type { AuditEvent } from '@/lib/schemas'

import {
  Badge,
  cellMono,
  cellText,
  cn,
  PageHeader,
  ResourceTable,
  StatCard,
  StatGrid,
  timeAgo,
} from '@datadack/serverless-ui'

const RANGES = [
  { label: '1h', since: '-1h' },
  { label: '24h', since: '-24h' },
  { label: '7d', since: '-168h' },
  { label: 'All', since: '' },
] as const

const OUTCOME_CLASSES: Record<string, string> = {
  success: 'text-status-success',
  failure: 'text-status-danger',
  denied: 'text-status-warning',
}

export function AuditPage() {
  const [rangeIndex, setRangeIndex] = useState(1)
  const [failuresOnly, setFailuresOnly] = useState(false)
  const range = RANGES[rangeIndex] ?? RANGES[1]

  const { data, isLoading, error } = useAuditEvents({
    since: range.since || undefined,
    failuresOnly,
    limit: 500,
  })
  const events = data ?? []

  const columns = useMemo<ColumnDef<AuditEvent>[]>(
    () => [
      {
        accessorKey: 'occurredAt',
        header: 'When',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-[12px] whitespace-nowrap">
            {timeAgo(row.original.occurredAt)}
          </span>
        ),
      },
      {
        accessorKey: 'action',
        header: 'Action',
        cell: ({ row }) => (
          <span className="font-mono text-[12px] font-medium">{row.original.action}</span>
        ),
      },
      {
        accessorKey: 'resourceName',
        header: 'Resource',
        cell: ({ row }) => cellMono(row.original.resourceName),
      },
      {
        accessorKey: 'principalId',
        header: 'Principal',
        cell: ({ row }) => (
          <span
            className={cn(
              'font-mono text-[12px]',
              // An unauthenticated call is shown as such rather than blending in
              // with signed ones.
              row.original.principalId === 'anonymous' && 'text-muted-foreground italic',
            )}
          >
            {row.original.principalId}
          </span>
        ),
      },
      {
        accessorKey: 'outcome',
        header: 'Outcome',
        cell: ({ row }) => (
          <Badge variant="outline" className="gap-1 font-mono text-[11px]">
            <span className={OUTCOME_CLASSES[row.original.outcome] ?? ''}>
              {row.original.outcome}
            </span>
            <span className="text-muted-foreground">{row.original.statusCode}</span>
          </Badge>
        ),
      },
      {
        accessorKey: 'durationMs',
        header: 'Took',
        cell: ({ row }) => cellMono(`${String(row.original.durationMs)} ms`),
      },
      {
        accessorKey: 'sourceIp',
        header: 'Source',
        cell: ({ row }) => cellText(row.original.sourceIp),
      },
      {
        accessorKey: 'error',
        header: 'Detail',
        cell: ({ row }) =>
          row.original.error ? (
            <span
              className="text-status-danger max-w-72 truncate text-[12px]"
              title={row.original.error}
            >
              {row.original.error}
            </span>
          ) : (
            cellText()
          ),
      },
    ],
    [],
  )

  const failures = events.filter((event) => event.outcome !== 'success').length
  const principals = new Set(events.map((event) => event.principalId)).size

  return (
    <>
      <PageHeader
        title="Audit"
        icon={ShieldCheck}
        description="Every mutating request, with the principal that made it and what came of it."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="border-border bg-card inline-flex overflow-hidden rounded-lg border">
          {RANGES.map((option, index) => (
            <button
              key={option.label}
              type="button"
              onClick={() => {
                setRangeIndex(index)
              }}
              className={cn(
                'px-2.5 py-1 font-mono text-[11px] transition-colors',
                index === rangeIndex
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="text-muted-foreground flex items-center gap-1.5 text-[12px]">
          <input
            type="checkbox"
            checked={failuresOnly}
            onChange={(event) => {
              setFailuresOnly(event.target.checked)
            }}
            className="accent-brand-gold size-3.5"
          />
          Failures only
        </label>
      </div>

      {error && (
        <div className="border-status-danger/40 bg-status-danger-bg text-status-danger mb-4 rounded-lg border px-3 py-2 text-[12px]">
          {apiErrorMessage(error)}
        </div>
      )}

      <StatGrid className="mb-6">
        <StatCard label="Events" value={events.length} icon={ScrollText} loading={isLoading} />
        <StatCard
          label="Failed or denied"
          value={failures}
          icon={ShieldX}
          color={failures > 0 ? 'danger' : 'default'}
          loading={isLoading}
        />
        <StatCard label="Principals" value={principals} icon={UserCheck} loading={isLoading} />
        <StatCard
          label="Window"
          value={range.label === 'All' ? 'All time' : range.label}
          loading={isLoading}
        />
      </StatGrid>

      <ResourceTable
        data={events}
        columns={columns}
        loading={isLoading}
        searchPlaceholder="Filter events…"
        emptyIcon={ShieldCheck}
        emptyTitle="Nothing recorded yet"
        emptyDescription="Deploy, delete or invoke something and it appears here. Reads are not recorded."
      />
    </>
  )
}
