import { useMemo } from "react"

import { Textarea } from "@DataDack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Wallet } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Field } from "../components/form-fields"
import { useAdjustAccountBalance } from "../superadmin.hooks"
import type { AdjustBalanceRequest, OverviewAccount } from "../superadmin.types"

// ₹ formatter — the wallet is rupee-denominated (1 credit = ₹1).
const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
})

const schema = z.object({
  entry_type: z.enum(["credit", "debit"]),
  // The wallet moves by a DELTA, never to an absolute total — an operator who
  // means "set the balance to 500" would otherwise silently add 500 to it.
  amount: z.coerce.number().positive("Enter an amount greater than 0"),
  description: z.string().min(1, "Give a reason — this lands in the account's statement").max(512),
})

type FormValues = z.infer<typeof schema>

const EMPTY: FormValues = { entry_type: "credit", amount: 0, description: "" }

interface Props {
  account: OverviewAccount | null
  /**
   * Idempotency key for this opening of the dialog. The backend uniquely indexes
   * (ref_type, ref_id), so a double-submitted top-up is rejected rather than
   * credited twice. The caller mints it when opening and keys this component on
   * it, so each opening gets a fresh form and a fresh key — while a retry within
   * one opening reuses it deliberately: if a request succeeded but its response
   * was lost, retrying fails loudly instead of crediting the account again.
   */
  refId: string
  onOpenChange: (open: boolean) => void
}

export function AccountBalanceDialog({ account, refId, onOpenChange }: Readonly<Props>) {
  const { t } = useTranslation()
  const { mutate: adjust, isPending } = useAdjustAccountBalance()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<z.input<typeof schema>, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  })

  const entryType = useWatch({ control, name: "entry_type" })
  const amount = useWatch({ control, name: "amount" })

  // Preview the wallet after this movement, so the operator sees the resulting
  // balance before committing rather than the delta alone.
  const projected = useMemo(() => {
    if (!account) return 0
    const delta = Number(amount)
    if (Number.isNaN(delta)) return account.balance
    return entryType === "credit" ? account.balance + delta : account.balance - delta
  }, [account, amount, entryType])

  const onSubmit = (values: FormValues) => {
    if (!account) return
    const payload: AdjustBalanceRequest = {
      account_id: account.id,
      entry_type: values.entry_type,
      amount: values.amount,
      currency: "INR",
      description: values.description.trim(),
      // A manual grant is an ADJUSTMENT, not a "topup": ref_type=topup means
      // money actually changed hands through the payment gateway, and folding
      // operator grants into it would overstate revenue in the ledger.
      ref_type: "adjustment",
      ref_id: refId,
    }
    adjust(payload, {
      onSuccess: () => {
        onOpenChange(false)
      },
    })
  }

  return (
    <Dialog open={!!account} onOpenChange={onOpenChange}>
      <DialogContent className="glass-3 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="size-4" />
            {t("superAdmin.organizations.balance.title")}
          </DialogTitle>
          <DialogDescription>
            {account
              ? t("superAdmin.organizations.balance.subtitle", {
                  name: account.name,
                  number: account.account_number,
                })
              : null}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-5">
          <div className="flex items-baseline justify-between rounded-lg border border-border-glass bg-muted/30 px-4 py-3">
            <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("superAdmin.organizations.balance.current")}
            </span>
            <span className="font-mono text-[15px] tabular-nums text-foreground">
              {inr.format(account?.balance ?? 0)}
            </span>
          </div>

          <Field
            label={t("superAdmin.organizations.balance.direction")}
            required
            error={errors.entry_type?.message}
          >
            <Controller
              control={control}
              name="entry_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">
                      {t("superAdmin.organizations.balance.credit")}
                    </SelectItem>
                    <SelectItem value="debit">
                      {t("superAdmin.organizations.balance.debit")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field
            label={t("superAdmin.organizations.balance.amount")}
            required
            error={errors.amount?.message}
            hint={t("superAdmin.organizations.balance.amountHint")}
          >
            <Input
              type="number"
              min={0}
              step="0.01"
              className="font-mono tabular-nums"
              {...register("amount")}
            />
          </Field>

          <Field
            label={t("superAdmin.organizations.balance.reason")}
            required
            error={errors.description?.message}
            hint={t("superAdmin.organizations.balance.reasonHint")}
          >
            <Textarea rows={2} {...register("description")} />
          </Field>

          <div className="flex items-baseline justify-between rounded-lg border border-border-glass px-4 py-3">
            <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("superAdmin.organizations.balance.projected")}
            </span>
            <span className="font-mono text-[15px] font-medium tabular-nums text-foreground">
              {inr.format(projected)}
            </span>
          </div>

          {projected < 0 && (
            <p className="text-[11px] text-destructive">
              {t("superAdmin.organizations.balance.negativeWarning")}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                onOpenChange(false)
              }}
            >
              {t("console.wizard.cancel")}
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {t("superAdmin.organizations.balance.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
