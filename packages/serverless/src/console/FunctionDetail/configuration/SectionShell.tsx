import type { ReactNode } from "react"

import { Button, css, cx, glass2 } from "@datadack/common-ui"

/* Natural height, not `flex: 1`. The pane around it is as tall as the page,
   and a section that stretches into it turns four fields into a metre of empty
   glass. */
const panel = css`
  display: flex;
  flex-direction: column;
  border-radius: 0.75rem;
  padding: 20px;
`

const headRow = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const heading = css`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
`

const blurb = css`
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--muted-foreground);
`

const body = css`
  margin-top: 16px;
`

const footer = css`
  margin-top: auto;
  padding-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

export interface SectionShellProps {
  title: string
  description?: string
  /** Whether this section supports editing at all (capabilities.configEdit). */
  editable?: boolean
  editing?: boolean
  onEdit?: () => void
  onCancel?: () => void
  onSave?: () => void
  /** Button loading while the PATCH is in flight. */
  saving?: boolean
  /** e.g. not dirty / invalid. */
  saveDisabled?: boolean
  editLabel?: string
  saveLabel?: string
  cancelLabel?: string
  /**
   * Header controls for a section whose action is not "edit these fields" —
   * Function URL creates and releases a resource rather than saving a form, so
   * it supplies its own button instead of borrowing the Edit/Save frame.
   */
  actions?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * The chrome every Configuration section shares: a glass panel with a title,
 * an Edit button in view mode, and a Cancel/Save footer in edit mode. Sections
 * own their draft state; this only owns the frame.
 */
export function SectionShell({
  title,
  description,
  editable = false,
  editing = false,
  onEdit,
  onCancel,
  onSave,
  saving = false,
  saveDisabled = false,
  editLabel,
  saveLabel,
  cancelLabel,
  actions,
  children,
  className,
}: Readonly<SectionShellProps>) {
  return (
    <section className={cx(glass2, panel, className)}>
      <div className={headRow}>
        <h3 className={heading}>{title}</h3>
        {actions}
        {editable && !editing && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            {editLabel}
          </Button>
        )}
      </div>
      {description && <p className={blurb}>{description}</p>}

      <div className={body}>{children}</div>

      {editing && (
        <div className={footer}>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant="gold"
            size="sm"
            loading={saving}
            disabled={saving || saveDisabled}
            onClick={onSave}
          >
            {saveLabel}
          </Button>
        </div>
      )}
    </section>
  )
}
