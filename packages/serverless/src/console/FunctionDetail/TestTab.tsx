import { useMemo, useState } from "react"

import { Play } from "lucide-react"

import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  StatusBadge,
  Textarea,
  css,
  cx,
  fontMono,
  glass2,
  media,
  mix,
} from "@datadack/common-ui"

import { errorMessage } from "./errorMessage"
import type { FunctionDetailLabels } from "./labels"
import { TEST_EVENT_TEMPLATES, type TestEventTemplate } from "./testEvents"
import { useInvokeFunction } from "../../data/queries"
import type { FunctionEntity, InvokeResult } from "../../data/types"

const grid = css`
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr);

  ${media.lg} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const panel = css`
  border-radius: 0.75rem;
  padding: 20px;
`

const panelTitle = css`
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
`

const field = css`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
`

const payloadInput = css`
  font-family: ${fontMono};
  font-size: 13px;
`

const inlineError = css`
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--destructive);
`

const runButton = css`
  margin-top: 12px;
`

const hintLine = css`
  margin: 0;
  font-size: 13px;
  color: var(--muted-foreground);
`

const pendingSkeleton = css`
  height: 128px;
  border-radius: 0.5rem;
`

const resultHead = css`
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
`

const resultMeta = css`
  font-family: ${fontMono};
  font-size: 12px;
  color: var(--muted-foreground);
`

const preBlock = css`
  margin: 0;
  max-height: 320px;
  overflow: auto;
  border: 1px solid ${mix("--border", 70)};
  border-radius: 0.5rem;
  padding: 12px;
  font-family: ${fontMono};
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-word;
`

const logsBlock = css`
  margin-top: 12px;
`

const logsSummary = css`
  cursor: pointer;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
`

/** The body, pretty-printed when it happens to be JSON. */
function displayBody(result: InvokeResult): string {
  if (!result.body) return ""
  try {
    return JSON.stringify(JSON.parse(result.body), null, 2)
  } catch {
    return result.body
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
 * right. The payload is parse-checked before invoking — a malformed event is a
 * form error, not a request.
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
  const [invalidJson, setInvalidJson] = useState(false)

  const result = invoke.data
  const body = useMemo(() => (result ? displayBody(result) : ""), [result])
  const succeeded = result ? result.status < 400 && !result.functionError : false

  const run = () => {
    try {
      JSON.parse(payload)
    } catch {
      setInvalidJson(true)
      return
    }
    setInvalidJson(false)
    invoke.mutate(payload)
  }

  return (
    <div className={cx(grid, className)}>
      <section className={cx(glass2, panel)}>
        <h3 className={panelTitle}>{labels.test.payload}</h3>

        <div className={field}>
          <Label>{labels.test.template}</Label>
          <Select
            value={templateId}
            onValueChange={(id) => {
              setTemplateId(id)
              const template = templates.find((candidate) => candidate.id === id)
              if (template) setPayload(template.body)
            }}
          >
            <SelectTrigger aria-label={labels.test.template}>
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
        </div>

        <Textarea
          value={payload}
          rows={12}
          spellCheck={false}
          aria-invalid={invalidJson || undefined}
          className={payloadInput}
          onChange={(event) => {
            setPayload(event.target.value)
          }}
        />
        {invalidJson && <p className={inlineError}>{labels.test.invalidJson}</p>}

        <Button className={runButton} loading={invoke.isPending} onClick={run}>
          <Play size={14} />
          {invoke.isPending ? labels.test.running : labels.test.run}
        </Button>
      </section>

      <section className={cx(glass2, panel)}>
        <h3 className={panelTitle}>{labels.test.response}</h3>

        {!result && !invoke.isPending && !invoke.isError && (
          <p className={hintLine}>{labels.test.hint}</p>
        )}
        {invoke.isPending && <Skeleton className={pendingSkeleton} />}
        {invoke.isError && (
          <p className={inlineError}>{errorMessage(invoke.error, labels.test.failed)}</p>
        )}

        {result && (
          <>
            <div className={resultHead}>
              <StatusBadge status={succeeded ? "active" : "error"} />
              <span className={resultMeta}>
                HTTP {result.status} · {result.durationMs} ms
                {result.executedVersion &&
                  ` · ${labels.test.executedVersion} ${result.executedVersion}`}
              </span>
            </div>
            <pre className={preBlock}>{body || labels.test.empty}</pre>

            {result.logs && (
              <details className={logsBlock}>
                <summary className={logsSummary}>{labels.test.logs}</summary>
                <pre className={preBlock}>{result.logs}</pre>
              </details>
            )}
          </>
        )}
      </section>
    </div>
  )
}
