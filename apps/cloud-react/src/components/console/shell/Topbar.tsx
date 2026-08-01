import { useEffect, useState } from "react"

import { LifeBuoy } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Logo } from "@/components/Logo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RGSelector } from "@/modules/resource-groups/components/RGSelector"

import { NotificationsMenu } from "./NotificationsMenu"
import { RegionSelector } from "./RegionSelector"
import { SearchTrigger } from "./SearchTrigger"
import { UserMenu } from "./UserMenu"

interface TopbarProps {
  onOpenSearch: () => void
}

/** True once the page has scrolled past the very top — drives the mobile hairline. */
function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 4)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
    }
  }, [])
  return scrolled
}

/**
 * Static, full-width console top bar (Datadack Cloud Console v2). On md+ it is
 * the fixed 52px single-row chrome with the search pill dead centre. Below md it
 * grows a second row of context chips — the resource-group and region selectors
 * that the single-row layout has no room for — and shows a hairline divider once
 * the page scrolls so the blurred bar reads as a surface over the content.
 */
export function Topbar({ onOpenSearch }: Readonly<TopbarProps>) {
  const { t } = useTranslation()
  const scrolled = useScrolled()

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex-none border-b bg-transparent px-3.5 backdrop-blur-xl transition-colors",
        scrolled ? "border-border/60 md:border-transparent" : "border-transparent",
      )}
    >
      {/* Row 1 */}
      <div className="flex h-13 items-center gap-3">
        {/* Left cluster — equal flex with the right so the search sits dead centre */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            to="/"
            className="shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Logo
              iconClassName="size-6"
              className="text-[15px]"
              wordmarkClassName="whitespace-nowrap"
            />
          </Link>

          <div className="mx-0.5 hidden h-5 w-px bg-border md:block" />
          <div className="hidden items-center gap-2 md:flex">
            <RGSelector />
          </div>
        </div>

        {/* Centre — search pill (desktop only; on mobile the search icon
                    joins the right cluster instead of floating dead-centre) */}
        <div className="hidden w-full max-w-md shrink justify-center px-2 md:flex">
          <SearchTrigger onOpen={onOpenSearch} pill />
        </div>

        {/* Right cluster */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
          <div className="md:hidden">
            <SearchTrigger onOpen={onOpenSearch} />
          </div>
          {/* On phones support lives in the user menu; three targets max here */}
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="hidden rounded-lg text-muted-foreground hover:text-foreground sm:inline-flex"
            aria-label={t("nav.support")}
          >
            <Link to="/support/tickets" title={t("nav.support")}>
              <LifeBuoy className="size-4" />
            </Link>
          </Button>
          <NotificationsMenu />
          <div className="hidden md:block">
            <RegionSelector />
          </div>
          <div className="mx-0.5 hidden h-5 w-px bg-border md:block" />
          <UserMenu />
        </div>
      </div>

      {/* Row 2 — mobile-only context chips. The same selectors the desktop
                row shows inline; below md this is their only home. */}
      <div className="flex items-stretch gap-2 pb-2.5 pt-0.5 md:hidden">
        <div className="flex min-w-0 flex-1 *:w-full">
          <RGSelector />
        </div>
        <div className="flex min-w-0 flex-1 *:w-full">
          <RegionSelector />
        </div>
      </div>
    </header>
  )
}
