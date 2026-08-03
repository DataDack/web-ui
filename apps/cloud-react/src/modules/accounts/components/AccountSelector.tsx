import { useState } from "react"

import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@datadack/common-ui"
import { Check, ChevronsUpDown, Plus, Star, Wallet } from "lucide-react"
import { useTranslation } from "react-i18next"

import { staggerDelay } from "@/components/console"

import { useActiveAccount, useSwitchAccount } from "../accounts.hooks"
import { CreateAccountSheet } from "../partials/CreateAccountSheet"

/**
 * Account-first tenant switcher. The account is the primary scope — this picks
 * which one the console runs under (X-Account-Id). Lists the caller's own account
 * plus any they were invited into; their owned/home account is starred. Rendered
 * as a page-header control, so it uses solid surface tokens (visible on light and
 * dark) rather than the topbar's translucent glass.
 */
export function AccountSelector() {
  const { t } = useTranslation()
  const { accounts, activeAccount, isLoading } = useActiveAccount()
  const switchAccount = useSwitchAccount()
  const [createOpen, setCreateOpen] = useState(false)

  if (!isLoading && !activeAccount) return null

  const displayName = activeAccount?.name ?? (isLoading ? "…" : t("accounts.selector.none"))

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-auto min-w-[20rem] justify-start gap-3 rounded-xl border-border bg-card py-2 pl-2 pr-3.5 shadow-xs hover:bg-accent"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-gold-soft text-brand-gold">
              <Wallet className="size-4.5" />
            </span>
            <span className="flex min-w-0 flex-col items-start leading-tight">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("accounts.selector.label")}
              </span>
              <span className="max-w-[260px] truncate text-[15px] font-semibold text-foreground">
                {displayName}
              </span>
            </span>
            <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-80 p-2">
          <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("accounts.selector.switchLabel")}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {isLoading ? (
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              {t("common.loading")}
            </DropdownMenuItem>
          ) : (
            accounts.map((account, index) => {
              const isActive = activeAccount?.id === account.id
              return (
                <DropdownMenuItem
                  key={account.id}
                  disabled={account.status === "closed"}
                  onSelect={() => {
                    if (!isActive) switchAccount(account)
                  }}
                  className={cn(
                    "animate-content-enter flex cursor-pointer items-center gap-3 rounded-lg border px-2.5 py-2.5",
                    isActive ? "border-brand-gold/40 bg-brand-gold-soft" : "border-transparent",
                  )}
                  style={staggerDelay(index)}
                >
                  <span className="relative grid size-11 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <Wallet className="size-5" />
                    <span
                      className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-popover"
                      style={{
                        background:
                          account.status === "active"
                            ? "var(--success-pulse)"
                            : "var(--bsc-outline)",
                      }}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {account.name}
                      </span>
                      {account.is_owner && (
                        <Star className="size-3.5 shrink-0 fill-brand-gold text-brand-gold" />
                      )}
                    </span>
                    <span className="block truncate font-mono text-xs text-muted-foreground">
                      {account.account_number}
                    </span>
                    {account.organization && (
                      <span className="block truncate text-[11px] text-muted-foreground/75">
                        {account.organization.name}
                      </span>
                    )}
                  </span>
                  {isActive && <Check className="size-4.5 shrink-0 text-brand-gold" />}
                </DropdownMenuItem>
              )
            })
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setCreateOpen(true)
            }}
            className="cursor-pointer gap-2 rounded-lg"
          >
            <Plus className="size-3.5" />
            {t("accounts.create")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateAccountSheet open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
