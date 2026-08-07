import { useEffect, useState } from "react"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  css,
  cx,
  fontMono,
  glass3,
} from "@datadack/common-ui"

const content = css`
  max-width: 28rem;
`

const field = css`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const monoInput = css`
  font-family: ${fontMono};
`

const errorLine = css`
  margin: 0;
  font-size: 13px;
  color: var(--destructive);
`

export interface PathDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  label: string
  confirmLabel: string
  cancelLabel: string
  /** Prefilled value — the parent folder for a create, the old path for a rename. */
  initialValue: string
  placeholder?: string
  hint?: string
  /** Returns a message when the path is unacceptable, otherwise nothing. */
  validate: (path: string) => string | undefined
  onSubmit: (path: string) => void
  loading?: boolean
}

/**
 * One dialog behind new file, new folder and rename — all three ask for a
 * package-relative path and differ only in copy and validation.
 *
 * Validation runs on submit rather than per keystroke: half-typed paths are
 * always invalid, and an error that appears at the first character reads as
 * the dialog arguing with you.
 */
export function PathDialog({
  open,
  onOpenChange,
  title,
  label,
  confirmLabel,
  cancelLabel,
  initialValue,
  placeholder,
  hint,
  validate,
  onSubmit,
  loading = false,
}: Readonly<PathDialogProps>) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState<string>()

  // Reopening for a different file must not show the previous one's path.
  useEffect(() => {
    if (open) {
      setValue(initialValue)
      setError(undefined)
    }
  }, [open, initialValue])

  const submit = () => {
    const message = validate(value)
    if (message) {
      setError(message)
      return
    }
    onSubmit(value.trim())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cx(glass3, content)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {hint && <DialogDescription>{hint}</DialogDescription>}
        </DialogHeader>

        <div className={field}>
          <Label htmlFor="datadack-code-path">{label}</Label>
          <Input
            id="datadack-code-path"
            value={value}
            placeholder={placeholder}
            className={monoInput}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => {
              setValue(event.target.value)
              setError(undefined)
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                submit()
              }
            }}
          />
          {error && <p className={errorLine}>{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={loading}
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {cancelLabel}
          </Button>
          <Button type="button" variant="gold" loading={loading} onClick={submit}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
