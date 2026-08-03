import { useState, type ReactNode } from "react"

import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@datadack/common-ui"
import { Loader2, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel?: string
  destructive?: boolean
  /** Require typing this exact string (e.g. the resource name) to enable confirm */
  confirmText?: string
  onConfirm: () => void
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = true,
  confirmText,
  onConfirm,
  loading = false,
}: Readonly<ConfirmDialogProps>) {
  const { t } = useTranslation()
  const [typed, setTyped] = useState("")
  const blocked = !!confirmText && typed !== confirmText
  const richDescription = typeof description !== "string" && typeof description !== "number"

  const handleOpenChange = (next: boolean) => {
    if (!next) setTyped("")
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md glass-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {destructive && <TriangleAlert className="size-4 text-destructive" />}
            {title}
          </DialogTitle>
          {richDescription ? (
            <DialogDescription asChild>
              <div className="text-sm text-muted-foreground">{description}</div>
            </DialogDescription>
          ) : (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        {confirmText && (
          <div className="space-y-1.5">
            <p className="text-[13px] text-muted-foreground">
              {t("console.confirm.typeToConfirm")}{" "}
              <span className="font-mono text-foreground">{confirmText}</span>
            </p>
            <Input
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value)
              }}
              placeholder={confirmText}
              className="font-mono"
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
            {t("console.confirm.cancel")}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "gold"}
            onClick={onConfirm}
            disabled={blocked || loading}
            className={cn(loading && "gap-2")}
          >
            {loading && <Loader2 className="size-3.5 animate-spin" />}
            {confirmLabel ?? t("console.confirm.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
