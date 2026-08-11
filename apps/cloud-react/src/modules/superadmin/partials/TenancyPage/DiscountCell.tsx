import { useEffect, useRef, useState, type SyntheticEvent } from "react"

import { Check, Pencil, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button, Input } from "@datadack/common-ui"

import type { AccountRow } from "./types"
import { useSetAccountDiscount } from "../../superadmin.hooks"

// Inline editor for an account's permanent resource discount (%) and the reason
// it was granted. Renders the current value with a pencil affordance; clicking it
// swaps in a small number input plus a reason field with save/cancel. All clicks
// stopPropagation so the surrounding row's navigation (→ account resources)
// doesn't fire while editing.
//
// The reason is mandatory for any non-zero discount — the server rejects a blank
// one, and Save stays disabled here so the operator finds that out before the
// round trip rather than after it. Clearing the discount to 0 needs no reason:
// there is nothing left to justify, and the stored reason is dropped with it.
export function DiscountCell({ account }: Readonly<{ account: AccountRow }>) {
  const { t } = useTranslation()
  const setDiscount = useSetAccountDiscount()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(account.permanent_discount))
  const [reason, setReason] = useState(account.permanent_discount_reason)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const pct = Number(value)
  const trimmedReason = reason.trim()
  // A non-zero discount without a reason is not submittable; an out-of-range or
  // non-numeric percentage isn't either.
  const canSave =
    !Number.isNaN(pct) && pct >= 0 && pct <= 100 && (pct === 0 || trimmedReason.length > 0)

  const stop = (e: SyntheticEvent) => {
    e.stopPropagation()
  }

  const reset = () => {
    setValue(String(account.permanent_discount))
    setReason(account.permanent_discount_reason)
  }

  const save = (e: SyntheticEvent) => {
    stop(e)
    if (!canSave) return
    // Clearing the discount clears its reason, mirroring the server.
    const nextReason = pct === 0 ? "" : trimmedReason
    if (pct === account.permanent_discount && nextReason === account.permanent_discount_reason) {
      setEditing(false)
      return
    }
    setDiscount.mutate(
      { accountId: account.id, permanentDiscount: pct, reason: nextReason },
      {
        onSuccess: () => {
          setEditing(false)
        },
      },
    )
  }

  const cancel = (e: SyntheticEvent) => {
    stop(e)
    reset()
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="flex items-start gap-1.5">
        <div className="min-w-0">
          <span className="tabular-nums text-[13px]">{account.permanent_discount}%</span>
          {account.permanent_discount > 0 && account.permanent_discount_reason ? (
            // The reason is why the percentage is defensible — worth a line in
            // the table, truncated with the full text on hover for long ones.
            <p
              className="max-w-[14rem] truncate text-[11px] text-muted-foreground"
              title={account.permanent_discount_reason}
            >
              {account.permanent_discount_reason}
            </p>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground hover:text-foreground"
          aria-label={t("superAdmin.organizations.discount.edit")}
          onClick={(e) => {
            stop(e)
            reset()
            setEditing(true)
          }}
        >
          <Pencil className="size-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-1">
      <Input
        ref={inputRef}
        type="number"
        min={0}
        max={100}
        step="0.01"
        value={value}
        disabled={setDiscount.isPending}
        onClick={stop}
        onChange={(e) => {
          setValue(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") save(e)
          else if (e.key === "Escape") cancel(e)
        }}
        className="h-7 w-20"
      />
      <Input
        type="text"
        maxLength={200}
        value={reason}
        // Nothing to justify at 0% — the field goes away rather than sitting
        // there inviting a reason for a discount that isn't being given.
        disabled={setDiscount.isPending || pct === 0}
        placeholder={t("superAdmin.organizations.discount.reasonPlaceholder")}
        aria-label={t("superAdmin.organizations.discount.reason")}
        onClick={stop}
        onChange={(e) => {
          setReason(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") save(e)
          else if (e.key === "Escape") cancel(e)
        }}
        className="h-7 w-48"
      />
      <Button
        variant="ghost"
        size="icon"
        className="size-6 text-emerald-600 hover:text-emerald-700"
        aria-label={t("superAdmin.organizations.discount.save")}
        title={canSave ? undefined : t("superAdmin.organizations.discount.reasonRequired")}
        disabled={setDiscount.isPending || !canSave}
        onClick={save}
        loading={setDiscount.isPending}
      >
        <Check className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-6 text-muted-foreground hover:text-foreground"
        aria-label={t("superAdmin.organizations.discount.cancel")}
        disabled={setDiscount.isPending}
        onClick={cancel}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  )
}
