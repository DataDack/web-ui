import { Suspense, lazy } from "react"

import { Skeleton, css, cx, mix } from "@datadack/common-ui"

import { loadMonacoSetup } from "../code/monacoLoader"

// Monaco is the largest thing either console can load, so the Test tab reaches
// it the same way the Code tab does: behind React.lazy, with the app's setup
// module (the one that calls `loader.config({ monaco })`) awaited inside the
// same boundary. Opening a function detail page does not pull the editor —
// opening a tab that shows code does.
const JsonMonaco = lazy(async () => {
  await loadMonacoSetup()
  return import("./JsonMonaco")
})

const frame = css`
  position: relative;
  overflow: hidden;
  border: 1px solid ${mix("--border", 70)};
  border-radius: 0.5rem;
  background: var(--card);
`

const invalidFrame = css`
  border-color: ${mix("--destructive", 70)};
`

const fallback = css`
  width: 100%;
  height: 100%;
  border-radius: 0;
`

export interface JsonPaneProps {
  modelPath: string
  value: string
  /** Defaults to "json"; pass "plaintext" for a body that is not JSON. */
  language?: string
  readOnly?: boolean
  /** Pane height in pixels. Both panes on the Test tab pass the same one. */
  height: number
  /** Paints the border red while the buffer does not parse. */
  invalid?: boolean
  onChange?: (value: string) => void
  onSubmit?: () => void
  className?: string
}

/**
 * A bordered, fixed-height Monaco box.
 *
 * The border and the rounded corners live out here rather than in the editor so
 * the pane matches every other framed control on the page, and so the skeleton
 * shown while Monaco loads occupies exactly the space the editor will — the
 * panel does not jump when the chunk lands.
 */
export function JsonPane({
  modelPath,
  value,
  language = "json",
  readOnly = false,
  height,
  invalid = false,
  onChange,
  onSubmit,
  className,
}: Readonly<JsonPaneProps>) {
  return (
    <div className={cx(frame, invalid && invalidFrame, className)} style={{ height }}>
      <Suspense fallback={<Skeleton className={fallback} />}>
        <JsonMonaco
          modelPath={modelPath}
          value={value}
          language={language}
          readOnly={readOnly}
          onChange={onChange}
          onSubmit={onSubmit}
        />
      </Suspense>
    </div>
  )
}
