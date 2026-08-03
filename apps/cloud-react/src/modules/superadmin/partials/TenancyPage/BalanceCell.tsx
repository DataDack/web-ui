import { Button, cn } from "@datadack/common-ui"
import { Plus } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { AccountRow } from "./types"

// ₹ formatter — the wallet is rupee-denominated (1 credit = ₹1).
const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
})

// Shows the account's available balance with a button that opens the top-up /
// deduction dialog. Unlike the discount, a wallet movement is a delta against
// real money, so it gets a confirming dialog rather than an inline edit.
export function BalanceCell({
  account,
  onAdjust,
}: Readonly<{ account: AccountRow; onAdjust: (a: AccountRow) => void }>) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("tabular-nums text-[13px]", account.balance < 0 && "text-destructive")}>
        {inr.format(account.balance)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="size-6 text-muted-foreground hover:text-foreground"
        aria-label={t("superAdmin.organizations.balance.edit")}
        onClick={(e) => {
          e.stopPropagation()
          onAdjust(account)
        }}
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  )
}
