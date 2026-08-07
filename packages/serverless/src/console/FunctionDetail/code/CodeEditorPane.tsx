import { Suspense, lazy, useEffect, useState, type ReactNode } from "react"

import { FileCode2, FileLock2 } from "lucide-react"

import { EmptyState, Skeleton, css } from "@datadack/common-ui"

import { useFunctionCodeFile } from "../../../data/queries"
import { errorMessage } from "../errorMessage"
import type { FunctionDetailLabels } from "../labels"
import { CodeStatusBar } from "./CodeStatusBar"
import { languageFor } from "./language"

// Monaco is the largest thing either console can load. Keeping it behind
// React.lazy means the Functions list, the Test tab and every other route stay
// free of it, and it arrives only once someone opens a file.
const MonacoPane = lazy(() => import("./MonacoPane"))

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
  sha256?: string
  onChange: (path: string, value: string) => void
  onSave: () => void
}

/**
 * The editor half of the Code tab: loads whichever file is open, hands it to
 * Monaco, and reports the cursor to the status bar.
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
  sha256,
  onChange,
  onSave,
}: Readonly<CodeEditorPaneProps>) {
  const copy = labels.code
  const [cursor, setCursor] = useState({ line: 1, column: 1 })

  // Binary files are listed but never fetched: the control plane sends no
  // content for them, so asking would be a round trip for an empty string.
  const file = useFunctionCodeFile(functionName, binary ? "" : path, scope)

  // A new file starts at the top rather than wherever the last one was read.
  useEffect(() => {
    setCursor({ line: 1, column: 1 })
  }, [path])

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
          onCursorChange={(line, column) => {
            setCursor({ line, column })
          }}
        />
      </Suspense>
    )
  }

  return (
    <div className={pane}>
      <div className={body}>{content}</div>
      <CodeStatusBar
        path={binary ? "" : path}
        language={language}
        line={cursor.line}
        column={cursor.column}
        readOnly={readOnly}
        sha256={sha256}
        labels={labels}
      />
    </div>
  )
}
