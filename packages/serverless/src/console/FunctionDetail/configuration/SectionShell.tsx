import type { ReactNode } from "react"

import type { LucideIcon } from "lucide-react"

import { Button, css, cx, fontMono, glass2, mix } from "@datadack/common-ui"

/* Natural height, not `flex: 1`. Three of these share a screen now, and a
   section that stretches turns four fields into a metre of empty glass.
   Padding lives on the head/body/footer rather than the panel so the header's
   hairline runs the full width of the card. */
const panel = css`
  display: flex;
  flex-direction: column;
  border-radius: 0.75rem;
  padding: 0;
`

/* The header is a band, not a line of text: a mono, letter-spaced title beside
   its icon, hairline-separated from the body. It is what makes a column of
   panels scan as instrument rows rather than as stacked cards. */
const headRow = css`
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid ${mix("--border", 45)};
  border-radius: 0.75rem 0.75rem 0 0;
  background: ${mix("--foreground", 3)};
  padding: 8px 16px;
`

const headTitle = css`
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
`

const headIcon = css`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: var(--brand-gold);
`

const heading = css`
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${fontMono};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--foreground);
`

const headActions = css`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
`

const blurb = css`
  margin: 0 0 14px;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--muted-foreground);
`

const body = css`
  padding: 16px;
`

const footer = css`
  display: flex;
  margin-top: auto;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid ${mix("--border", 45)};
  padding: 12px 16px;
`

export interface SectionShellProps {
  title: string
  /** Rendered in the header band, in the brand accent. */
  icon?: LucideIcon
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
 * The chrome every Configuration section shares: a glass panel with a mono
 * header band, an Edit button in view mode, and a Cancel/Save footer in edit
 * mode. Sections own their draft state; this only owns the frame.
 */
export function SectionShell({
  title,
  icon: Icon,
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
        <span className={headTitle}>
          {Icon && <Icon className={headIcon} aria-hidden />}
          <h3 className={heading}>{title}</h3>
        </span>
        <span className={headActions}>
          {actions}
          {editable && !editing && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              {editLabel}
            </Button>
          )}
        </span>
      </div>

      <div className={body}>
        {description && <p className={blurb}>{description}</p>}
        {children}
      </div>

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
