import { Suspense, lazy, type ReactNode } from "react"

import { FileCode2, FileLock2 } from "lucide-react"

import { EmptyState, Skeleton, css, fontMono, mix } from "@datadack/common-ui"

import { useFunctionCodeFile } from "../../../data/queries"
import { errorMessage } from "../errorMessage"
import type { FunctionDetailLabels } from "../labels"
import { languageFor } from "./language"
import { loadMonacoSetup } from "./monacoLoader"

// Monaco is the largest thing either console can load. Keeping it behind
// React.lazy means the Functions list, the Test tab and every other route stay
// free of it, and it arrives only once someone opens a file.
//
// The app's setup module runs FIRST, inside the same boundary: it is what calls
// `loader.config({ monaco })`, and doing it here rather than at the app's route
// scope is what makes "configured before the editor mounts" an ordering
// guarantee instead of a race. See ./monacoLoader.
const MonacoPane = lazy(async () => {
  await loadMonacoSetup()
  return import("./MonacoPane")
})

const pane = css`
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
`

const body = css`
  display: flex;
  flex: 1;
  min-height: 0;
`

const fallback = css`
  flex: 1;
  border-radius: 0;
`

const breadcrumb = css`
  min-height: 30px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid ${mix("--border", 45)};
  font-family: ${fontMono};
  font-size: 10.5px;
  color: var(--muted-foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export interface CodeEditorPaneProps {
  functionName: string
  scope?: string
  /** Open file; "" when nothing is open. */
  path: string
  /** Whether the tree lists this path as binary — never opened as text. */
  binary: boolean
  /** The unsaved buffer for this path, when there is one. */
  buffer?: string
  readOnly: boolean
  labels: FunctionDetailLabels
  onChange: (path: string, value: string) => void
  onSave: () => void
  /** Reported upward: the status bar spans the whole workbench, not this pane. */
  onCursorChange: (line: number, column: number) => void
}

/**
 * The editor half of the Code tab: loads whichever file is open and hands it to
 * Monaco.
 *
 * The buffer, when present, always wins over the fetched content — it is the
 * user's unsaved typing, and a background refetch must never overwrite it.
 */
export function CodeEditorPane({
  functionName,
  scope,
  path,
  binary,
  buffer,
  readOnly,
  labels,
  onChange,
  onSave,
  onCursorChange,
}: Readonly<CodeEditorPaneProps>) {
  const copy = labels.code

  // Binary files are listed but never fetched: the control plane sends no
  // content for them, so asking would be a round trip for an empty string.
  const file = useFunctionCodeFile(functionName, binary ? "" : path, scope)

  const language = languageFor(path)

  let content: ReactNode
  if (path === "") {
    content = <EmptyState icon={FileCode2} title={copy.noFileOpen} />
  } else if (binary) {
    content = <EmptyState icon={FileLock2} title={copy.binaryFile} />
  } else if (file.isLoading) {
    content = <Skeleton className={fallback} />
  } else if (file.isError) {
    content = (
      <EmptyState
        icon={FileCode2}
        title={copy.errors.openFailed}
        description={errorMessage(file.error, copy.errors.openFailed)}
      />
    )
  } else {
    content = (
      <Suspense fallback={<Skeleton className={fallback} />}>
        <MonacoPane
          modelPath={`${functionName}/${path}`}
          language={language}
          value={buffer ?? file.data?.content ?? ""}
          readOnly={readOnly}
          onChange={(value) => {
            onChange(path, value)
          }}
          onSave={onSave}
          onCursorChange={onCursorChange}
        />
      </Suspense>
    )
  }

  return (
    <div className={pane}>
      {path !== "" && <div className={breadcrumb}>{path.split("/").join("  ›  ")}</div>}
      <div className={body}>{content}</div>
    </div>
  )
}
