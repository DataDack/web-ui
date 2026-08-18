import { useEffect, useMemo, useRef, useState } from "react"

import { ChevronDown, ChevronUp, Eraser, Play, X } from "lucide-react"

import { Button, css, cx, fontMono, mix } from "@datadack/common-ui"

import { useInvokeFunction } from "../../../data/queries"
import { errorMessage } from "../errorMessage"
import type { FunctionDetailLabels } from "../labels"

/** One line of the Output panel. `level` is the only thing that colours it. */
export interface CodeLogEntry {
  id: string
  at: Date
  level: "info" | "success" | "error"
  text: string
}

export type CodeDockPanel = "output" | "test"

const dock = css`
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  border-top: 1px solid ${mix("--border", 60)};
  background: var(--glass-1-bg);
`

const bar = css`
  display: flex;
  min-height: 34px;
  flex-shrink: 0;
  align-items: center;
  gap: 2px;
  padding: 0 8px 0 4px;
`

const panelTab = css`
  border: none;
  background: transparent;
  padding: 8px 10px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${mix("--muted-foreground", 80)};
  cursor: pointer;

  &:hover {
    color: var(--foreground);
  }
`

const panelTabActive = css`
  color: var(--foreground);
  box-shadow: inset 0 -2px 0 0 var(--brand-gold);
`

const spacer = css`
  flex: 1;
`

const barButton = css`
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  padding: 4px;
  color: var(--muted-foreground);
  cursor: pointer;

  &:hover {
    color: var(--foreground);
  }
`

const panelBody = css`
  display: flex;
  height: 196px;
  min-height: 0;
  border-top: 1px solid ${mix("--border", 45)};
`

const logScroll = css`
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 8px 12px 10px;
  font-family: ${fontMono};
  font-size: 11.5px;
  line-height: 1.75;
`

const logRow = css`
  display: flex;
  gap: 10px;
  white-space: pre-wrap;
  word-break: break-word;
`

const logTime = css`
  flex-shrink: 0;
  color: ${mix("--muted-foreground", 60)};
`

const logInfo = css`
  color: var(--muted-foreground);
`

const logSuccess = css`
  color: var(--brand-gold);
`

const logError = css`
  color: var(--destructive);
`

const emptyNote = css`
  margin: 0;
  padding: 10px 12px;
  font-size: 12px;
  color: var(--muted-foreground);
`

const testGrid = css`
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
`

const testColumn = css`
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
`

const testColumnRight = css`
  border-left: 1px solid ${mix("--border", 45)};
`

const testHead = css`
  display: flex;
  min-height: 30px;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  padding: 0 8px 0 12px;
  font-size: 11px;
  color: var(--muted-foreground);
`

const testHeadTitle = css`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const runButton = css`
  height: 24px;
  padding: 0 8px;
  font-size: 11px;
`

const payloadInput = css`
  flex: 1;
  min-height: 0;
  width: 100%;
  resize: none;
  border: none;
  outline: none;
  background: transparent;
  padding: 4px 12px 10px;
  font-family: ${fontMono};
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--foreground);

  &::placeholder {
    color: ${mix("--muted-foreground", 60)};
  }
`

const invalidInput = css`
  color: var(--destructive);
`

const resultScroll = css`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 4px 12px 10px;
`

const resultPre = css`
  margin: 0;
  font-family: ${fontMono};
  font-size: 11.5px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--foreground);
`

const resultLogs = css`
  margin: 8px 0 0;
  border-top: 1px dashed ${mix("--border", 70)};
  padding-top: 8px;
  font-family: ${fontMono};
  font-size: 11px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--muted-foreground);
`

const statusOk = css`
  color: var(--brand-gold);
`

const statusBad = css`
  color: var(--destructive);
`

const TONE: Record<CodeLogEntry["level"], string> = {
  info: logInfo,
  success: logSuccess,
  error: logError,
}

/** Clock time only — the dock is a session log, and the date is always today. */
function clock(at: Date): string {
  return at.toTimeString().slice(0, 8)
}

/** Pretty-printed when the body is JSON, verbatim when it is anything else. */
function prettyBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2)
  } catch {
    return body
  }
}

export interface CodeDockProps {
  functionName: string
  scope?: string
  labels: FunctionDetailLabels
  entries: readonly CodeLogEntry[]
  panel: CodeDockPanel
  onPanelChange: (panel: CodeDockPanel) => void
  /** Body hidden, bar still visible — the collapsed state, not the closed one. */
  collapsed: boolean
  onToggleCollapsed: () => void
  onClose: () => void
  onClear: () => void
  /** False hides the Test panel entirely (transport cannot invoke). */
  canInvoke: boolean
  className?: string
}

/**
 * The workbench's bottom panel: what this editor did, and a place to run what
 * it produced.
 *
 * Output is a session log, not a server one — saves, deploys and the errors
 * they returned, in the order they happened. A toast says the same thing for
 * two seconds; this is where you look afterwards to find out which of six
 * saves was the one that failed.
 *
 * Test is deliberately the small version: a payload, a Run, a response. The
 * full Test tab keeps the templates, the JSON editor and the formatter — this
 * one exists so a one-line fix can be re-run without leaving the file.
 */
export function CodeDock({
  functionName,
  scope,
  labels,
  entries,
  panel,
  onPanelChange,
  collapsed,
  onToggleCollapsed,
  onClose,
  onClear,
  canInvoke,
  className,
}: Readonly<CodeDockProps>) {
  const copy = labels.code.dock
  const invoke = useInvokeFunction(functionName, scope)
  const [payload, setPayload] = useState("{}")
  const logEnd = useRef<HTMLDivElement>(null)

  const active = canInvoke ? panel : "output"

  // Validity is derived rather than stored, so fixing the typo re-enables Run
  // on the same keystroke.
  const invalidJson = useMemo(() => {
    try {
      JSON.parse(payload)
      return false
    } catch {
      return true
    }
  }, [payload])

  // A log you have to scroll to read is a log nobody reads. Only while the
  // panel is actually showing — scrolling a hidden node is wasted work.
  useEffect(() => {
    if (collapsed || active !== "output") return
    logEnd.current?.scrollIntoView({ block: "end" })
  }, [entries, collapsed, active])

  const result = invoke.data
  const succeeded = result ? result.status < 400 && !result.functionError : false

  const run = () => {
    if (invalidJson) return
    invoke.mutate(payload)
  }

  return (
    <div className={cx(dock, className)}>
      <div className={bar}>
        <button
          type="button"
          className={cx(panelTab, active === "output" && panelTabActive)}
          onClick={() => {
            onPanelChange("output")
          }}
        >
          {copy.output}
        </button>
        {canInvoke && (
          <button
            type="button"
            className={cx(panelTab, active === "test" && panelTabActive)}
            onClick={() => {
              onPanelChange("test")
            }}
          >
            {copy.test}
          </button>
        )}

        <span className={spacer} />

        {active === "output" && entries.length > 0 && (
          <button
            type="button"
            className={barButton}
            aria-label={copy.clear}
            title={copy.clear}
            onClick={onClear}
          >
            <Eraser size={13} />
          </button>
        )}
        <button
          type="button"
          className={barButton}
          aria-label={collapsed ? copy.expand : copy.collapse}
          title={collapsed ? copy.expand : copy.collapse}
          onClick={onToggleCollapsed}
        >
          {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <button
          type="button"
          className={barButton}
          aria-label={copy.close}
          title={copy.close}
          onClick={onClose}
        >
          <X size={14} />
        </button>
      </div>

      {!collapsed && (
        <div className={panelBody}>
          {active === "output" &&
            (entries.length === 0 ? (
              <p className={emptyNote}>{copy.outputEmpty}</p>
            ) : (
              <div className={logScroll}>
                {entries.map((entry) => (
                  <div className={logRow} key={entry.id}>
                    <span className={logTime}>{clock(entry.at)}</span>
                    <span className={TONE[entry.level]}>{entry.text}</span>
                  </div>
                ))}
                <div ref={logEnd} />
              </div>
            ))}

          {active === "test" && (
            <div className={testGrid}>
              <div className={testColumn}>
                <div className={testHead}>
                  <span className={testHeadTitle}>{labels.test.payload}</span>
                  <Button
                    size="sm"
                    className={runButton}
                    loading={invoke.isPending}
                    onClick={run}
                    disabled={invalidJson || invoke.isPending}
                  >
                    <Play size={12} />
                    {invoke.isPending ? labels.test.running : labels.test.run}
                  </Button>
                </div>
                <textarea
                  className={cx(payloadInput, invalidJson && invalidInput)}
                  value={payload}
                  spellCheck={false}
                  aria-label={labels.test.payload}
                  aria-invalid={invalidJson}
                  onChange={(event) => {
                    setPayload(event.target.value)
                  }}
                />
              </div>

              <div className={cx(testColumn, testColumnRight)}>
                <div className={testHead}>
                  <span className={testHeadTitle}>{labels.test.response}</span>
                  {result && (
                    <span className={succeeded ? statusOk : statusBad}>
                      HTTP {result.status} · {copy.duration(result.durationMs)}
                    </span>
                  )}
                </div>
                <div className={resultScroll}>
                  {invoke.isError && (
                    <pre className={cx(resultPre, statusBad)}>
                      {errorMessage(invoke.error, labels.test.failed)}
                    </pre>
                  )}
                  {!invoke.isError && !result && (
                    <p className={emptyNote}>
                      {invalidJson ? labels.test.invalidJson : labels.test.hint}
                    </p>
                  )}
                  {result && (
                    <>
                      <pre className={resultPre}>
                        {result.body ? prettyBody(result.body) : labels.test.empty}
                      </pre>
                      {result.logs && <pre className={resultLogs}>{result.logs}</pre>}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
