import { useMemo, useState } from "react"

import { Braces, Play } from "lucide-react"

import {
  Button,
  CopyButton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  StatusBadge,
  css,
  cx,
  fontMono,
  glass2,
  media,
  mix,
} from "@datadack/common-ui"

import { errorMessage } from "./errorMessage"
import type { FunctionDetailLabels } from "./labels"
import { JsonPane } from "./test"
import { TEST_EVENT_TEMPLATES, type TestEventTemplate } from "./testEvents"
import { useInvokeFunction } from "../../data/queries"
import type { FunctionEntity, InvokeResult } from "../../data/types"

/** Both editors are this tall, so the two panels line up rather than stagger. */
const PANE_HEIGHT = 340

const grid = css`
  display: grid;
  gap: 16px;
  align-items: start;
  grid-template-columns: minmax(0, 1fr);

  ${media.lg} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const panel = css`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
  border-radius: 0.75rem;
  padding: 20px;
`

/* Title on the left, actions on the right — the same row on both panels, so the
   two editors below them start at the same y. */
const panelHead = css`
  display: flex;
  min-height: 32px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const panelTitle = css`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
`

const headActions = css`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
`

/* Wide enough for the longest starter's label without letting a console that
   passes its own templates stretch the header out of the panel. */
const templateSelect = css`
  min-width: 150px;
  max-width: 200px;
`

/* The one line each panel carries between its header and its editor: the hint
   on the left, the status on the right. Fixed height on both so the two editors
   below them line up. */
const metaLine = css`
  display: flex;
  min-height: 22px;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 13px;
  color: var(--muted-foreground);
`

const inlineError = css`
  color: var(--destructive);
`

const pendingSkeleton = css`
  height: ${PANE_HEIGHT}px;
  border-radius: 0.5rem;
`

/* Monospaced so a rerun does not shuffle the row sideways as the duration
   changes width. */
const resultNumbers = css`
  font-family: ${fontMono};
  font-size: 12px;
`

const errorChip = css`
  border-radius: 0.25rem;
  border: 1px solid ${mix("--destructive", 60)};
  padding: 1px 6px;
  color: var(--destructive);
`

const logsBlock = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const logsSummary = css`
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
`

const logsPre = css`
  margin: 0;
  max-height: 220px;
  overflow: auto;
  border: 1px solid ${mix("--border", 70)};
  border-radius: 0.5rem;
  background: var(--card);
  padding: 12px;
  font-family: ${fontMono};
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
`

/** The parsed value, or undefined when the text is not JSON. */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

/**
 * The body as the viewer should show it: pretty-printed, and reported as JSON
 * so the pane can syntax-highlight it. A body that is not JSON — a plain-text
 * error page, an empty 204 — is shown verbatim as plain text rather than
 * highlighted as something it is not.
 */
function displayBody(result: InvokeResult): { text: string; json: boolean } {
  if (!result.body) return { text: "", json: false }
  try {
    return { text: JSON.stringify(JSON.parse(result.body), null, 2), json: true }
  } catch {
    return { text: result.body, json: false }
  }
}

export interface TestTabProps {
  fn: FunctionEntity
  scope?: string
  labels: FunctionDetailLabels
  /** Extra/replacement starter payloads; defaults to TEST_EVENT_TEMPLATES. */
  templates?: readonly TestEventTemplate[]
  className?: string
}

/**
 * Lambda's Test tab: a JSON event on the left, the execution result on the
 * right.
 *
 * Both sides are Monaco rather than a textarea and a `<pre>`. An event is the
 * one thing on this page a person types by hand, and a wall of unhighlighted
 * braces is where a missing comma hides; the result is the one thing they read
 * closely, and folding a nested object beats scrolling past it. The editor is
 * already in the bundle for the Code tab, so this costs a shared chunk, not a
 * new dependency.
 *
 * The payload is parse-checked as it is typed — a malformed event disables Run
 * rather than producing a failed request.
 */
export function TestTab({
  fn,
  scope,
  labels,
  templates = TEST_EVENT_TEMPLATES,
  className,
}: Readonly<TestTabProps>) {
  const invoke = useInvokeFunction(fn.name, scope)
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "")
  const [payload, setPayload] = useState(templates[0]?.body ?? "{}")

  // Validity is derived, not stored: a state flag set on Run only goes stale
  // the moment someone fixes the very typo it is complaining about.
  const parsed = useMemo(() => parseJson(payload), [payload])
  const invalidJson = parsed === undefined

  const result = invoke.data
  const body = useMemo(() => (result ? displayBody(result) : null), [result])
  const succeeded = result ? result.status < 400 && !result.functionError : false

  const run = () => {
    if (invalidJson) return
    invoke.mutate(payload)
  }

  const format = () => {
    if (parsed === undefined) return
    setPayload(JSON.stringify(parsed, null, 2))
  }

  // What the result panel says while it has no result to show.
  let status = labels.test.hint
  if (invoke.isPending) status = labels.test.running
  else if (invoke.isError) status = errorMessage(invoke.error, labels.test.failed)

  return (
    <div className={cx(grid, className)}>
      <section className={cx(glass2, panel)}>
        <div className={panelHead}>
          <h3 className={panelTitle}>{labels.test.payload}</h3>
          <div className={headActions}>
            <Select
              value={templateId}
              onValueChange={(id) => {
                setTemplateId(id)
                const template = templates.find((candidate) => candidate.id === id)
                if (template) setPayload(template.body)
              }}
            >
              <SelectTrigger
                size="sm"
                aria-label={labels.test.template}
                className={templateSelect}
              >
                <SelectValue placeholder={labels.test.template} />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={format} disabled={invalidJson}>
              <Braces size={14} />
              {labels.test.format}
            </Button>
            {/* Passing `disabled` explicitly overrides the Button's own
                loading→disabled default, so the in-flight case is spelled out
                here — otherwise a second click fires a second invocation. */}
            <Button
              size="sm"
              loading={invoke.isPending}
              onClick={run}
              disabled={invalidJson || invoke.isPending}
            >
              <Play size={14} />
              {invoke.isPending ? labels.test.running : labels.test.run}
            </Button>
          </div>
        </div>

        {/* One line above the editor, matching the result's status line, so the
            two editors start at the same y instead of staggering. */}
        <p className={cx(metaLine, invalidJson && inlineError)}>
          {invalidJson ? labels.test.invalidJson : labels.test.payloadHint}
        </p>

        <JsonPane
          modelPath={`${fn.name}/__test__/event.json`}
          value={payload}
          height={PANE_HEIGHT}
          invalid={invalidJson}
          onChange={setPayload}
          onSubmit={run}
        />
      </section>

      <section className={cx(glass2, panel)}>
        <div className={panelHead}>
          <h3 className={panelTitle}>{labels.test.response}</h3>
          {body?.text && (
            <CopyButton
              value={body.text}
              label={labels.test.copy}
              mono={false}
              copiedLabel={labels.test.copied}
            />
          )}
        </div>

        {/* The same slot as the left panel's hint, so the panels stay a matched
            pair whether there is a result in it or not. */}
        {result && body ? (
          <div className={metaLine}>
            <StatusBadge status={succeeded ? "active" : "error"} />
            <span className={resultNumbers}>
              HTTP {result.status} · {result.durationMs} ms
              {result.executedVersion &&
                ` · ${labels.test.executedVersion} ${result.executedVersion}`}
            </span>
            {result.functionError && (
              <span className={cx(resultNumbers, errorChip)}>
                {labels.test.functionError}: {result.functionError}
              </span>
            )}
          </div>
        ) : (
          <p className={cx(metaLine, invoke.isError && inlineError)}>{status}</p>
        )}

        {invoke.isPending && <Skeleton className={pendingSkeleton} />}

        {result && body && (
          <>
            <JsonPane
              modelPath={`${fn.name}/__test__/result.${body.json ? "json" : "txt"}`}
              value={body.text || labels.test.empty}
              language={body.json ? "json" : "plaintext"}
              readOnly
              height={PANE_HEIGHT}
            />

            {result.logs && (
              <details className={logsBlock}>
                <summary className={logsSummary}>{labels.test.logs}</summary>
                <pre className={logsPre}>{result.logs}</pre>
              </details>
            )}
          </>
        )}
      </section>
    </div>
  )
}
