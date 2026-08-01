import { useState } from "react"

import { Avatar, AvatarFallback } from "@DataDack/common-ui"
import { Check, LifeBuoy, LogOut, Plus, Settings, ShieldCheck, Star, Wallet } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@datadack/common-ui"
import { cn } from "@/lib/utils"
import { ACCOUNT_ROUTES } from "@/modules/accounts/accounts.constants"
import { useActiveAccount, useSwitchAccount } from "@/modules/accounts/accounts.hooks"
import { CreateAccountSheet } from "@/modules/accounts/partials/CreateAccountSheet"
import { useAuth } from "@/modules/auth/auth.context"
import { ORG_ROUTES } from "@/modules/organizations/organizations.constants"
import { ThemeToggle } from "@/services/theme_service"

const LANGUAGES = [
  { code: "en", script: "EN", native: "English" },
  { code: "hi", script: "HI", native: "हिंदी" },
] as const

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "U"
}

/** Inline segmented language switch — mirrors the theme toggle's pill styling. */
function LanguageToggle() {
  const { i18n, t } = useTranslation()
  return (
    <div
      role="group"
      aria-label={t("nav.language")}
      className="flex items-center gap-0.5 rounded-full border border-border-glass bg-surface-glass p-0.5"
    >
      {LANGUAGES.map((lang) => {
        const active = i18n.resolvedLanguage === lang.code
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => void i18n.changeLanguage(lang.code)}
            aria-pressed={active}
            className={cn(
              "flex h-7 min-w-9 items-center justify-center rounded-full px-2 font-mono text-[11px] transition-colors",
              active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {lang.script}
          </button>
        )
      })}
    </div>
  )
}

export function UserMenu() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { accounts, activeAccount } = useActiveAccount()
  const switchAccount = useSwitchAccount()
  const [createOpen, setCreateOpen] = useState(false)

  const name = user?.name ?? "—"
  const email = user?.email ?? ""
  const isSuperAdmin = user?.is_super_admin === true

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-auto gap-2.5 rounded-full py-1 pl-3 pr-1 hover:bg-muted/50"
            aria-label={t("console.shell.account")}
          >
            <div className="hidden flex-col items-end leading-tight md:flex">
              <span className="text-[13px] font-semibold text-foreground">{name}</span>
              <span className="text-[11px] text-brand-gold">{activeAccount?.name ?? email}</span>
            </div>
            <Avatar className="size-8">
              <AvatarFallback className="bg-brand-gold text-[11px] font-bold text-brand-gold-foreground">
                {initialsOf(name)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 overflow-hidden rounded-xl p-0">
          {/* Identity hero — gold wash + avatar anchor */}
          <div className="flex items-start gap-3 bg-linear-to-br from-brand-gold-soft to-transparent px-4 pt-4 pb-3.5">
            <Avatar className="size-11 shrink-0 ring-2 ring-brand-gold/25">
              <AvatarFallback className="bg-brand-gold text-sm font-bold text-brand-gold-foreground">
                {initialsOf(name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col pt-0.5">
              <span className="truncate text-[15px] font-semibold leading-tight text-foreground">
                {name}
              </span>
              <span className="truncate text-xs leading-snug text-muted-foreground">{email}</span>
            </div>
            {user?.user_type && (
              <span className="shrink-0 rounded-full bg-brand-gold-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-gold">
                {t(`onboarding.type.${user.user_type}`)}
              </span>
            )}
          </div>

          {/* Account switcher — the caller's accounts (their own + any they
                    were invited into); the active one is checked, the owned one
                    starred. Account-first: this replaces the old org switcher. */}
          {activeAccount && (
            <div className="space-y-1 border-t px-2.5 pt-2.5">
              <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("account.label", { defaultValue: "Account" })}
              </p>
              {accounts.map((account) => {
                const isActive = account.id === activeAccount.id
                return (
                  <DropdownMenuItem
                    key={account.id}
                    disabled={account.status === "closed"}
                    onSelect={() => {
                      if (!isActive) switchAccount(account)
                    }}
                    className={cn(
                      "gap-3 rounded-lg border px-2.5 py-2",
                      isActive ? "border-brand-gold/40 bg-brand-gold-soft" : "border-border",
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-brand-gold-soft text-brand-gold">
                      <Wallet className="size-4.5" />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col leading-tight">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">{account.name}</span>
                        {account.is_owner && (
                          <Star className="size-3 shrink-0 fill-brand-gold text-brand-gold" />
                        )}
                      </span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {account.organization?.name ??
                          t("accounts.personal", {
                            defaultValue: "Personal",
                          })}
                        <span className="mx-1 opacity-40">·</span>
                        <span className="font-mono">{account.account_number}</span>
                      </span>
                    </div>
                    {isActive && <Check className="size-4 shrink-0 text-brand-gold" />}
                  </DropdownMenuItem>
                )
              })}
              <DropdownMenuItem
                onSelect={() => {
                  void navigate(ACCOUNT_ROUTES.ROOT)
                }}
                className="gap-3 rounded-lg border border-dashed border-border px-2.5 py-2 text-muted-foreground focus:text-foreground"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-dashed border-border">
                  <Settings className="size-4.5" />
                </span>
                <span className="text-sm font-medium">
                  {t("accounts.settings", { defaultValue: "Account settings" })}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setCreateOpen(true)
                }}
                className="gap-3 rounded-lg border border-dashed border-border px-2.5 py-2 text-muted-foreground focus:text-foreground"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-dashed border-border">
                  <Plus className="size-4.5" />
                </span>
                <span className="text-sm font-medium">{t("accounts.create")}</span>
              </DropdownMenuItem>
            </div>
          )}

          {/* Preferences — grouped in a boxed list; controls keep the menu open */}
          <div className="px-2.5 py-2.5">
            <div
              className="divide-y divide-border overflow-hidden rounded-lg border"
              onClick={(e) => {
                e.stopPropagation()
              }}
              role="presentation"
            >
              <div className="flex h-11 items-center justify-between gap-3 px-3">
                <span className="text-sm text-foreground">{t("nav.toggleTheme")}</span>
                <ThemeToggle />
              </div>
              <div className="flex h-11 items-center justify-between gap-3 px-3">
                <span className="text-sm text-foreground">{t("nav.language")}</span>
                <LanguageToggle />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t p-1.5">
            {isSuperAdmin && (
              <DropdownMenuItem
                className="gap-2.5 py-2"
                onClick={() => {
                  void navigate("/admin")
                }}
              >
                <ShieldCheck className="size-4" />
                {t("superAdmin.nav.entry")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="gap-2.5 py-2"
              onClick={() => {
                void navigate(ORG_ROUTES.PROFILE)
              }}
            >
              <Settings className="size-4" />
              {t("nav.settings")}
            </DropdownMenuItem>
            {/* On phones the topbar hides its support icon; this is the way in */}
            <DropdownMenuItem
              className="gap-2.5 py-2 sm:hidden"
              onClick={() => {
                void navigate("/support/tickets")
              }}
            >
              <LifeBuoy className="size-4" />
              {t("nav.support")}
            </DropdownMenuItem>
          </div>

          {/* Sign out — separated so it's never a mis-tap away from navigation */}
          <div className="border-t p-1.5">
            <DropdownMenuItem
              variant="destructive"
              className="gap-2.5 py-2 font-medium"
              onClick={logout}
            >
              <LogOut className="size-4" />
              {t("console.shell.signOut")}
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateAccountSheet open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}
