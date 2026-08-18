import { GitBranch, Lock } from "lucide-react"

import { css, cx, fontMono, mix } from "@datadack/common-ui"

import type { FunctionDetailLabels } from "../labels"
import { languageLabel } from "./language"

const bar = css`
  display: flex;
  align-items: center;
  gap: 14px;
  border-top: 1px solid ${mix("--border", 60)};
  padding: 5px 12px;
  font-family: ${fontMono};
  font-size: 10.5px;
  color: ${mix("--muted-foreground", 85)};
  background: ${mix("--brand-gold", 5)};
  box-shadow: inset 2px 0 0 var(--brand-gold);
`

const item = css`
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
`

const icon = css`
  width: 11px;
  height: 11px;
`

const gap = css`
  flex: 1;
`

export interface CodeStatusBarProps {
  /** The open file's path; empty when nothing is open. */
  path: string
  language: string
  line: number
  column: number
  readOnly: boolean
  /** Package digest of what is being edited — draft or deployed. */
  sha256?: string
  labels: FunctionDetailLabels
}

/** The editor's footer: where the cursor is and what it is sitting in. */
export function CodeStatusBar({
  path,
  language,
  line,
  column,
  readOnly,
  sha256,
  labels,
}: Readonly<CodeStatusBarProps>) {
  const copy = labels.code.status

  return (
    <div className={bar}>
      {sha256 && (
        <span className={item} title={sha256}>
          <GitBranch className={icon} aria-hidden />
          {sha256.slice(0, 7)}
        </span>
      )}
      {readOnly && (
        <span className={item}>
          <Lock className={icon} aria-hidden />
          {copy.readOnly}
        </span>
      )}
      <span className={cx(item, gap)} />
      {path !== "" && (
        <>
          <span className={item}>{copy.position(line, column)}</span>
          <span className={item}>{copy.encoding}</span>
          <span className={item}>{languageLabel(language)}</span>
        </>
      )}
    </div>
  )
}
