import { useState, type ReactNode } from "react"

import { TriangleAlert } from "lucide-react"

import {
  Button,
  css,
  cx,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  fontMono,
  glass3,
  Input,
} from "@datadack/common-ui"

const content = css`
  max-width: 28rem;
`

const titleRow = css`
  display: flex;
  align-items: center;
  gap: 8px;
`

const warnIcon = css`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--destructive);
`

const richBody = css`
  font-size: 14px;
  color: var(--muted-foreground);
`

const typeToConfirm = css`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const typeToConfirmHint = css`
  font-size: 13px;
  color: var(--muted-foreground);
`

const monoValue = css`
  font-family: ${fontMono};
  color: var(--foreground);
`

const monoInput = css`
  font-family: ${fontMono};
`

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Plain text, or rich content (rendered inside the description slot). */
  description: ReactNode
  onConfirm: () => void
  confirmLabel?: string
  cancelLabel?: string
  /** Styles the confirm button destructive (vs gold) and shows the warning icon. */
  destructive?: boolean
  /** Require typing this exact string (e.g. the resource name) to enable confirm. */
  confirmText?: string
  /**
   * Prompt above the type-to-confirm input. A `{value}` token is replaced with
   * `confirmText` rendered in mono; without the token the mono value is
   * appended after the label.
   */
  typeToConfirmLabel?: string
  loading?: boolean
}

/**
 * A guarded confirmation dialog for destructive (or merely consequential)
 * actions, with an optional type-the-name-to-confirm gate.
 *
 * All strings arrive as props so host consoles can route them through their
 * own i18n; the defaults are plain English.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  confirmText,
  typeToConfirmLabel = "Type {value} to confirm",
  loading = false,
}: Readonly<ConfirmDialogProps>) {
  const [typed, setTyped] = useState("")
  const blocked = !!confirmText && typed !== confirmText
  const richDescription = typeof description !== "string" && typeof description !== "number"

  const handleOpenChange = (next: boolean) => {
    if (!next) setTyped("")
    onOpenChange(next)
  }

  // Split the prompt on the {value} token so the confirm target renders inline
  // in mono wherever the label puts it; token-less labels get it appended.
  const tokenAt = typeToConfirmLabel.indexOf("{value}")
  const hintBefore = tokenAt >= 0 ? typeToConfirmLabel.slice(0, tokenAt) : `${typeToConfirmLabel} `
  const hintAfter = tokenAt >= 0 ? typeToConfirmLabel.slice(tokenAt + "{value}".length) : ""

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cx(glass3, content)}>
        <DialogHeader>
          <DialogTitle className={titleRow}>
            {destructive && <TriangleAlert className={warnIcon} aria-hidden="true" />}
            {title}
          </DialogTitle>
          {richDescription ? (
            <DialogDescription asChild>
              <div className={richBody}>{description}</div>
            </DialogDescription>
          ) : (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        {confirmText && (
          <div className={typeToConfirm}>
            <p className={typeToConfirmHint}>
              {hintBefore}
              <span className={monoValue}>{confirmText}</span>
              {hintAfter}
            </p>
            <Input
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value)
              }}
              placeholder={confirmText}
              className={monoInput}
              autoComplete="off"
            />
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              handleOpenChange(false)
            }}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "gold"}
            onClick={onConfirm}
            disabled={blocked || loading}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
