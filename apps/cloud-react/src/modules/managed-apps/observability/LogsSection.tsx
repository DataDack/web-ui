import { useState } from "react"

import { Button, cn, formatBytes, Skeleton } from "@datadack/common-ui"
import { RefreshCw, ScrollText, Search, ShieldAlert, X } from "lucide-react"

import { Section } from "@/components/console"

import { coverageFor } from "./feature-coverage"
import { useProjectLogs } from "../managed-apps.hooks"
import type { Project, RequestLogRange, RequestLogRow } from "../managed-apps.types"

const RANGES: { value: RequestLogRange; label: string }[] = [
  { value: "1h", label: "1h" },
  { value: "6h", label: "6h" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
]

const STATUS_CLASSES = [
  { value: "", label: "All" },
  { value: "2xx", label: "2xx" },
  { value: "3xx", label: "3xx" },
  { value: "4xx", label: "4xx" },
  { value: "5xx", label: "5xx" },
]

/**
 * Per-request runtime logs — one row per request the edge served.
 *
 * The gateway already records every field shown here while serving. This view
 * is the read side, and its whole job is to keep three states apart that all
 * look like "an empty table":
 *
 *   not configured   no log store is connected, so nothing has EVER been
 *                    written. The reader cannot fix this with a filter, and
 *                    telling them "no requests" would be a lie about their app.
 *   no matches       the store is live and this filter matched nothing.
 *   loading          neither is known yet.
 *
 * Collapsing the first two is the failure this component exists to avoid.
 */
export function LogsSection({ project }: Readonly<{ project: Project }>) {
  const [range, setRange] = useState<RequestLogRange>("24h")
  const [statusClass, setStatusClass] = useState("")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<RequestLogRow | null>(null)

  const { data, isLoading, isFetching, refetch } = useProjectLogs(project.id, {
    range,
    status_class: statusClass,
    search,
    limit: 200,
  })

  const rows = data?.rows ?? []
  const configured = data?.configured ?? false

  return (
    <Section
      variant="panel"
      title="Runtime logs"
      description="Every request the edge served for this app — status, cache decision, latency and firewall verdict."
      actions={
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={!configured || isFetching}
          onClick={() => void refetch()}
        >
          <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
          Refresh
        </Button>
      }
    >
      <div className="space-y-4">
        <FilterBar
          range={range}
          onRange={setRange}
          statusClass={statusClass}
          onStatusClass={setStatusClass}
          search={search}
          onSearch={setSearch}
          disabled={!configured && !isLoading}
        />

        {isLoading && <Skeleton className="h-64 w-full rounded-lg" />}
        {!isLoading && !configured && <NotConfigured project={project} />}
        {!isLoading && configured && rows.length === 0 && (
          <EmptyWindow retentionDays={data?.retention_days ?? 30} />
        )}
        {!isLoading && configured && rows.length > 0 && (
          <LogTable rows={rows} onSelect={setSelected} />
        )}
      </div>

      {selected && (
        <RequestDetail
          row={selected}
          onClose={() => {
            setSelected(null)
          }}
        />
      )}
    </Section>
  )
}

function FilterBar({
  range,
  onRange,
  statusClass,
  onStatusClass,
  search,
  onSearch,
  disabled,
}: Readonly<{
  range: RequestLogRange
  onRange: (value: RequestLogRange) => void
  statusClass: string
  onStatusClass: (value: string) => void
  search: string
  onSearch: (value: string) => void
  disabled: boolean
}>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-52 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={search}
          disabled={disabled}
          onChange={(event) => {
            onSearch(event.target.value)
          }}
          placeholder="Filter by path…"
          aria-label="Filter requests by path"
          className="h-8 w-full rounded-lg border border-border-glass bg-transparent pr-2.5 pl-8 text-[12px] outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
        />
      </div>

      <Segmented
        label="Status"
        options={STATUS_CLASSES}
        value={statusClass}
        onChange={onStatusClass}
        disabled={disabled}
      />
      <Segmented
        label="Range"
        options={RANGES}
        value={range}
        onChange={(value) => {
          onRange(value as RequestLogRange)
        }}
        disabled={disabled}
      />
    </div>
  )
}

function Segmented({
  label,
  options,
  value,
  onChange,
  disabled,
}: Readonly<{
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  disabled: boolean
}>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-0.5 rounded-lg border border-border-glass p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          aria-pressed={value === option.value}
          onClick={() => {
            onChange(option.value)
          }}
          className={cn(
            "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50",
            value === option.value
              ? "glass-1-bg-raised text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** The status colour, by family. */
function statusTone(status: number): string {
  if (status >= 500) return "text-status-danger"
  if (status >= 400) return "text-status-warning"
  if (status >= 300) return "text-status-info"
  return "text-status-success"
}

function LogTable({
  rows,
  onSelect,
}: Readonly<{ rows: RequestLogRow[]; onSelect: (row: RequestLogRow) => void }>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full min-w-[52rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-border/60 text-[10px] tracking-wide text-muted-foreground uppercase">
            <th scope="col" className="px-3 py-2 font-medium">
              Time
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Status
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Request
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Cache
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Size
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Latency
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.trace_id + row.ts}
              className="cursor-pointer border-b border-border/30 transition-colors last:border-0 hover:bg-accent/30"
              onClick={() => {
                onSelect(row)
              }}
            >
              <td className="px-3 py-1.5 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                {new Date(row.ts).toLocaleTimeString(undefined, { hour12: false })}
                <span className="text-muted-foreground/50">
                  .{String(new Date(row.ts).getMilliseconds()).padStart(3, "0")}
                </span>
              </td>
              <td className={cn("px-3 py-1.5 font-mono text-[11px]", statusTone(row.status))}>
                {row.status}
              </td>
              <td className="max-w-md px-3 py-1.5">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {row.method}
                  </span>
                  <span className="min-w-0 truncate font-mono text-[12px]" title={row.path}>
                    {row.path}
                  </span>
                  {row.filter === "block" && (
                    <ShieldAlert
                      className="size-3 shrink-0 text-status-danger"
                      aria-label="Blocked by the firewall"
                    />
                  )}
                </span>
              </td>
              <td className="px-3 py-1.5 font-mono text-[11px] text-muted-foreground uppercase">
                {row.cache || "—"}
              </td>
              <td className="px-3 py-1.5 text-right font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                {formatBytes(row.bytes)}
              </td>
              <td className="px-3 py-1.5 text-right font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                {row.took_ms}ms
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RequestDetail({ row, onClose }: Readonly<{ row: RequestLogRow; onClose: () => void }>) {
  return (
    <div className="mt-4 rounded-lg border border-border/60 glass-1-bg">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">{row.method}</span>
          <span className="min-w-0 truncate font-mono text-[13px]">{row.path}</span>
          <span className={cn("font-mono text-[12px]", statusTone(row.status))}>{row.status}</span>
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="size-7 p-0"
          aria-label="Close request detail"
          onClick={onClose}
        >
          <X className="size-3.5" />
        </Button>
      </div>
      <dl className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Trace ID", row.trace_id],
          ["Host", row.host],
          ["Time", new Date(row.ts).toLocaleString()],
          ["Client IP", row.client_ip],
          ["Protocol", row.proto],
          ["Region", row.region || "—"],
          ["Cache", row.cache || "—"],
          ["Edge latency", `${String(row.took_ms)}ms`],
          // The two are different questions: total is what the visitor waited,
          // upstream is how much of it the app is responsible for.
          ["Upstream latency", `${String(row.upstream_ms)}ms`],
          ["Response size", formatBytes(row.bytes)],
          ["Outcome", row.code || "ok"],
          [
            "Firewall",
            row.filter === "" ? "no rule matched" : `${row.filter} · ${row.filter_rules}`,
          ],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd className="mt-0.5 truncate font-mono text-[12px]" title={value}>
              {value}
            </dd>
          </div>
        ))}
        <div className="min-w-0 sm:col-span-2 lg:col-span-3">
          <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">User agent</dt>
          <dd className="mt-0.5 font-mono text-[11px] break-all text-muted-foreground">
            {row.user_agent || "—"}
          </dd>
        </div>
      </dl>
    </div>
  )
}

/**
 * No log store is connected. Says so plainly, and says what it means for the
 * app — because the reader's real question is "is something wrong with my
 * deployment", and the answer is no.
 */
function NotConfigured({ project }: Readonly<{ project: Project }>) {
  const coverage = coverageFor("runtime_log_retention_days")
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 px-6 py-12 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl glass-1-bg-raised">
        <ScrollText className="size-6 text-muted-foreground" />
      </div>
      <h3 className="text-[15px] font-semibold text-foreground">Log retention is being set up</h3>
      <p className="mt-1.5 max-w-md text-[13px] text-muted-foreground">
        The edge records a row for every request it serves — {project.subdomain} included — but the
        platform&rsquo;s log store is not connected on this deployment yet, so there is nothing to
        search here. Your app is being served normally.
      </p>
      {coverage?.customerNote && (
        <p className="mt-3 max-w-md text-[12px] text-muted-foreground/80">
          {coverage.customerNote}
        </p>
      )}
    </div>
  )
}

/** The store IS live and this filter matched nothing. A different sentence. */
function EmptyWindow({ retentionDays }: Readonly<{ retentionDays: number }>) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 px-6 py-12 text-center">
      <p className="text-[13px] text-muted-foreground">No requests matched in this window.</p>
      <p className="mt-1 text-[11px] text-muted-foreground/70">
        Logs are kept for {retentionDays} days — widen the range or clear the filters.
      </p>
    </div>
  )
}
