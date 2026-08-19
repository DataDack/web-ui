import { ArrowLeft, Menu } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { UserMenu } from "@/components/console/shell/UserMenu"
import { Logo } from "@/components/Logo"

import { Button } from "@datadack/common-ui"

/**
 * Top bar for the super-admin console. Carries an "admin" badge and an explicit
 * exit back to the tenant console, so the two surfaces never feel like one.
 */
export function AdminTopbar({ onOpenMobileNav }: Readonly<{ onOpenMobileNav: () => void }>) {
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-40 flex h-12 flex-none items-center gap-2 border-b border-border bg-(--topbar) px-3 backdrop-blur-xl">
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenMobileNav}
        className="size-8 shrink-0 rounded-lg text-muted-foreground lg:hidden"
        aria-label={t("console.nav.menu")}
      >
        <Menu className="size-4" />
      </Button>

      <Link
        to="/admin"
        className="flex shrink-0 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <Logo iconClassName="size-5" className="text-sm" wordmarkClassName="hidden sm:inline" />
        <span className="rounded border border-brand-gold/40 bg-brand-gold-soft px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-brand-gold">
          {t("superAdmin.title")}
        </span>
      </Link>

      <div className="flex flex-1 items-center justify-end gap-1.5">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <Link to="/">
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">{t("superAdmin.shell.exit")}</span>
          </Link>
        </Button>
        <div className="mx-0.5 hidden h-5 w-px bg-border md:block" />
        <UserMenu />
      </div>
    </header>
  )
}
