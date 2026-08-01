import { useEffect, useMemo, useRef, useState } from 'react'

import { Pause, Play, ScrollText, Trash2 } from 'lucide-react'

import { EmptyState } from '@/components/console/EmptyState'
import { PageHeader } from '@/components/console/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { streamLogs, type LogQuery } from '@/lib/api'
import { useDashboard, useLogSnapshot } from '@/lib/queries'
import type { LogLine } from '@/lib/schemas'
import { cn } from '@/lib/utils'

/** How many lines the pane holds. Past this the oldest are dropped: the browser
 *  is a tail, and an unbounded array is how a long-lived tab runs out of memory. */
const MAX_LINES = 2000

const LEVEL_CLASSES: Record<string, string> = {
  ERROR: 'text-status-danger',
  WARN: 'text-status-warning',
  INFO: 'text-muted-foreground',
}

export function LogsPage() {
  const [live, setLive] = useState(true)
  const [functionName, setFunctionName] = useState('')
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('')
  const [lines, setLines] = useState<LogLine[]>([])
  const [dropped, setDropped] = useState(0)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [pinnedToBottom, setPinnedToBottom] = useState(true)

  const { data: dashboard } = useDashboard()
  const functions = dashboard?.detail.functions ?? []

  const query = useMemo<LogQuery>(
    () => ({
      function: functionName || undefined,
      search: search || undefined,
      level: level || undefined,
      limit: 500,
    }),
    [functionName, search, level],
  )

  // With live tailing off the snapshot polls instead, so the view still updates
  // rather than freezing at whatever was on screen when the stream was paused.
  const snapshot = useLogSnapshot(query, !live)

  useEffect(() => {
    if (!live) return
    setStreamError(null)
    setDropped(0)
    setLines([])

    return streamLogs(query, {
      onLine: (line) => {
        setLines((current) => {
          const next = [...current, line]
          return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next
        })
      },
      onDropped: setDropped,
      onError: setStreamError,
    })
  }, [live, query])

  const snapshotLines = snapshot.data?.lines
  const visible = useMemo(
    () => (live ? lines : (snapshotLines ?? [])),
    [live, lines, snapshotLines],
  )

  const paneRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // Only follow the tail while the operator is at the bottom. Scrolling up to
    // read something and being yanked back down by the next line is the single
    // most annoying thing a log view can do.
    if (!pinnedToBottom) return
    const pane = paneRef.current
    if (pane) pane.scrollTop = pane.scrollHeight
  }, [visible, pinnedToBottom])

  return (
    <>
      <PageHeader
        title="Logs"
        icon={ScrollText}
        description="Live tail of platform lifecycle records and any function output workers report."
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button
          variant={live ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setLive((current) => !current)
          }}
        >
          {live ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
          {live ? 'Live' : 'Paused'}
        </Button>

        <select
          value={functionName}
          onChange={(event) => {
            setFunctionName(event.target.value)
          }}
          className="border-border bg-card text-foreground h-8 rounded-lg border px-2 text-[12px]"
          aria-label="Filter by function"
        >
          <option value="">All functions</option>
          {functions.map((fn) => (
            <option key={fn.id} value={fn.name}>
              {fn.name}
            </option>
          ))}
        </select>

        <select
          value={level}
          onChange={(event) => {
            setLevel(event.target.value)
          }}
          className="border-border bg-card text-foreground h-8 rounded-lg border px-2 text-[12px]"
          aria-label="Filter by level"
        >
          <option value="">All levels</option>
          <option value="INFO">Info</option>
          <option value="WARN">Warn</option>
          <option value="ERROR">Error</option>
        </select>

        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
          }}
          placeholder="Search messages…"
          className="h-8 w-full max-w-xs text-[13px]"
        />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setLines([])
            setDropped(0)
          }}
          aria-label="Clear the pane"
        >
          <Trash2 className="size-3.5" />
          Clear
        </Button>

        <span className="text-muted-foreground ml-auto font-mono text-[11px] tabular-nums">
          {visible.length} lines
        </span>
      </div>

      {streamError && (
        <div className="border-status-warning/40 bg-status-warning-bg text-status-warning mb-3 rounded-lg border px-3 py-2 text-[12px]">
          {streamError}
        </div>
      )}
      {dropped > 0 && (
        <div className="border-status-warning/40 bg-status-warning-bg text-status-warning mb-3 rounded-lg border px-3 py-2 text-[12px]">
          {dropped} lines dropped — the browser fell behind the stream. Narrow the filter to keep
          up.
        </div>
      )}

      <div
        ref={paneRef}
        onScroll={(event) => {
          const pane = event.currentTarget
          setPinnedToBottom(pane.scrollHeight - pane.scrollTop - pane.clientHeight < 40)
        }}
        className="glass-2 h-[calc(100vh-320px)] min-h-80 overflow-auto p-3 font-mono text-[12px] leading-relaxed"
      >
        {visible.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={live ? 'Waiting for output' : 'No buffered lines'}
            description={
              live
                ? 'Lines appear as functions are invoked. The control plane keeps a bounded recent window, not an archive.'
                : 'Nothing matches the current filter in the buffered window.'
            }
          />
        ) : (
          <ol>
            {visible.map((line) => (
              <li key={line.sequence} className="hover:bg-accent/30 flex gap-3 rounded px-1">
                <span className="text-muted-foreground/70 shrink-0 tabular-nums">
                  {new Date(line.timestamp).toLocaleTimeString(undefined, { hour12: false })}
                </span>
                <span
                  className={cn(
                    'w-14 shrink-0 truncate text-[11px]',
                    line.stream === 'platform' ? 'text-brand-gold' : 'text-muted-foreground/70',
                  )}
                >
                  {line.stream}
                </span>
                <span className="text-muted-foreground/70 hidden w-32 shrink-0 truncate lg:inline">
                  {line.functionName}
                </span>
                <span
                  className={cn(
                    'min-w-0 break-all whitespace-pre-wrap',
                    LEVEL_CLASSES[line.level ?? 'INFO'] ?? 'text-foreground',
                  )}
                >
                  {line.message}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {!pinnedToBottom && live && (
        <button
          type="button"
          onClick={() => {
            setPinnedToBottom(true)
          }}
          className="text-muted-foreground hover:text-foreground mt-2 text-[11px] underline-offset-2 hover:underline"
        >
          Jump to the newest lines
        </button>
      )}
    </>
  )
}
