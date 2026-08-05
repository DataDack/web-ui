import { useState } from "react"

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from "@datadack/common-ui"

/**
 * Collects the written justification the backend requires for suspend and
 * terminate.
 *
 * The reason is not decoration: it lands in the audit trail and, for a
 * suspension, on the control panel itself where the customer's support agent
 * will read it. So the confirm button stays disabled until something is typed.
 */
export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive,
  loading,
  onClose,
  onConfirm,
}: Readonly<{
  open: boolean
  title: string
  description: string
  confirmLabel: string
  destructive?: boolean
  loading?: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}>) {
  const [reason, setReason] = useState("")

  // Clear on close so the next account does not inherit the last one's reason.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setReason("")
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-[13px] text-muted-foreground">{description}</p>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
              }}
              placeholder="Payment overdue / abuse report / customer request"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              handleOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={loading === true || reason.trim() === ""}
            onClick={() => {
              onConfirm(reason.trim())
            }}
          >
            {loading ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
