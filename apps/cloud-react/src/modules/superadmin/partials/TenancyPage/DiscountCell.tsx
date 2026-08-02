import { useEffect, useRef, useState, type SyntheticEvent } from "react"

import { Button, Input } from "@datadack/common-ui"
import { Check, Pencil, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { AccountRow } from "./types"
import { useSetAccountDiscount } from "../../superadmin.hooks"

// Inline editor for an account's permanent resource discount (%). Renders the
// current value with a pencil affordance; clicking it swaps in a small number
// input with save/cancel. All clicks stopPropagation so the surrounding row's
// navigation (→ account resources) doesn't fire while editing.
export function DiscountCell({ account }: Readonly<{ account: AccountRow }>) {
  const { t } = useTranslation()
  const setDiscount = useSetAccountDiscount()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(account.permanent_discount))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const stop = (e: SyntheticEvent) => {
    e.stopPropagation()
  }

  const save = (e: SyntheticEvent) => {
    stop(e)
    const pct = Number(value)
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      setValue(String(account.permanent_discount))
      setEditing(false)
      return
    }
    if (pct === account.permanent_discount) {
      setEditing(false)
      return
    }
    setDiscount.mutate(
      { accountId: account.id, permanentDiscount: pct },
      {
        onSuccess: () => {
          setEditing(false)
        },
      },
    )
  }

  const cancel = (e: SyntheticEvent) => {
    stop(e)
    setValue(String(account.permanent_discount))
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="tabular-nums text-[13px]">{account.permanent_discount}%</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground hover:text-foreground"
          aria-label={t("superAdmin.organizations.discount.edit")}
          onClick={(e) => {
            stop(e)
            setValue(String(account.permanent_discount))
            setEditing(true)
          }}
        >
          <Pencil className="size-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
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
      <Button
        variant="ghost"
        size="icon"
        className="size-6 text-emerald-600 hover:text-emerald-700"
        aria-label={t("superAdmin.organizations.discount.save")}
        disabled={setDiscount.isPending}
        onClick={save}
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
