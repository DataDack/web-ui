import { ArrowRight, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Button } from "@datadack/common-ui"

import { AshokaChakra } from "./AshokaChakra"

interface FreedomSaleBannerProps {
  onDismiss: () => void
}

/**
 * The Independence Day strip that sits above the topbar for the length of the
 * seasonal window — the console's counterpart to the one on datadack.cloud.
 *
 * Not sticky by design: the topbar below it is, so the banner scrolls away on
 * the first flick and the console gets its full viewport back. Its colours come
 * from the `.freedom-*` tokens in index.css rather than from theme tokens, so
 * it reads the same saffron→green in light and dark.
 */
export function FreedomSaleBanner({ onDismiss }: Readonly<FreedomSaleBannerProps>) {
  const { t } = useTranslation()

  return (
    <div
      role="region"
      aria-label={t("seasonal.freedomSale.regionLabel")}
      className="freedom-banner flex-none"
    >
      <div className="flex min-h-9 items-center gap-2 px-3 py-1.5 sm:gap-3 sm:px-4">
        {/* Centre cluster — `flex-1` + `min-w-0` so the message takes whatever
            room the fixed-width claim/dismiss pair leaves and truncates rather
            than pushing them off a narrow viewport. */}
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 text-center">
          <AshokaChakra className="freedom-chakra size-3.5 text-[color:var(--freedom-navy)]" />
          <p className="min-w-0 truncate text-[13px] leading-5">
            <span className="font-semibold text-foreground">
              {t("seasonal.freedomSale.greeting")}
            </span>
            <span className="text-muted-foreground"> · </span>
            <span className="font-medium text-[color:var(--freedom-green-ink)]">
              {t("seasonal.freedomSale.headline")}
            </span>
            <span className="hidden text-muted-foreground sm:inline">
              {" · "}
              {t("seasonal.freedomSale.offer")}
            </span>
          </p>
        </div>

        {/* Right cluster — claim + dismiss */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="freedom-cta h-6 gap-1 px-2 text-[11px] font-semibold tracking-[0.08em] uppercase"
          >
            <Link to="/billing">
              {t("seasonal.freedomSale.cta")}
              <ArrowRight className="size-3" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-foreground"
            aria-label={t("seasonal.freedomSale.dismiss")}
            onClick={onDismiss}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Tricolour hairline closing the strip off from the topbar */}
      <div className="freedom-rule" />
    </div>
  )
}
