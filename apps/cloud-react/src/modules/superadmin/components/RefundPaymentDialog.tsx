import { useEffect, useMemo, useState } from "react"

import { RotateCcw } from "lucide-react"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  Textarea,
} from "@datadack/common-ui"

import { Field } from "./form-fields"
import { useRefundPayment } from "../superadmin.hooks"
import type { PaymentLedgerEntry } from "../superadmin.types"

interface Props {
  payment: PaymentLedgerEntry | null
  onOpenChange: (open: boolean) => void
}

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount / 100)

export function refundableAmount(payment: PaymentLedgerEntry): number {
  return Math.max(
    0,
    payment.amount -
      (payment.refunds ?? [])
        .filter((refund) => refund.status !== "failed")
        .reduce((sum, refund) => sum + refund.amount, 0),
  )
}

export function RefundPaymentDialog({ payment, onOpenChange }: Readonly<Props>) {
  const refund = useRefundPayment()
  const remaining = payment ? refundableAmount(payment) : 0
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [speed, setSpeed] = useState<"normal" | "optimum">("optimum")

  useEffect(() => {
    if (payment) {
      setAmount((remaining / 100).toFixed(2))
      setReason("")
      setConfirmation("")
      setSpeed("optimum")
    }
  }, [payment, remaining])

  const amountMinor = useMemo(() => Math.round(Number(amount) * 100), [amount])
  const error =
    amountMinor <= 0
      ? "Enter an amount greater than zero"
      : amountMinor > remaining
        ? `Maximum refundable amount is ${payment ? money(remaining, payment.currency) : "—"}`
        : reason.trim().length < 3
          ? "Enter a reason of at least 3 characters"
          : confirmation !== "REFUND"
            ? "Type REFUND to confirm"
            : ""

  const submit = () => {
    if (!payment || error) return
    refund.mutate(
      {
        paymentId: payment.id,
        payload: {
          amount: amountMinor,
          reason: reason.trim(),
          speed,
          ref_id: crypto.randomUUID(),
        },
      },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <Dialog open={!!payment} onOpenChange={onOpenChange}>
      <DialogContent className="glass-3 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="size-4" />
            Refund payment
          </DialogTitle>
          <DialogDescription>
            This sends money back through Razorpay and reverses the proportional wallet credits. It
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 rounded-lg border border-border-glass bg-muted/30 p-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Paid</div>
            <div className="font-mono font-semibold">
              {payment ? money(payment.amount, payment.currency) : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Remaining refundable</div>
            <div className="font-mono font-semibold">
              {payment ? money(remaining, payment.currency) : "—"}
            </div>
          </div>
        </div>

        {(payment?.refunds?.length ?? 0) > 0 && (
          <div className="max-h-32 space-y-2 overflow-y-auto" aria-label="Existing refunds">
            {payment?.refunds?.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate text-muted-foreground">{item.reason}</span>
                <span className="font-mono">{money(item.amount, item.currency)}</span>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        )}

        <Field label="Refund amount" required>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="font-mono"
          />
        </Field>
        <Field
          label="Refund speed"
          required
          hint="Optimum lets Razorpay choose the fastest available route."
        >
          <Select value={speed} onValueChange={(value) => setSpeed(value as "normal" | "optimum")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="optimum">Optimum</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Reason" required>
          <Textarea
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why is this payment being refunded?"
          />
        </Field>
        <Field
          label="Type REFUND to confirm"
          required
          error={
            confirmation && confirmation !== "REFUND" ? "Confirmation does not match" : undefined
          }
        >
          <Input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
          />
        </Field>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" disabled={refund.isPending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            loading={refund.isPending}
            disabled={!!error || refund.isPending}
            onClick={submit}
          >
            Refund {payment && amountMinor > 0 ? money(amountMinor, payment.currency) : "payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
