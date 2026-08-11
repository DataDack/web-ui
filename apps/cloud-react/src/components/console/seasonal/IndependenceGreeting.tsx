import { useEffect } from "react"

import { X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@datadack/common-ui"

import { AshokaChakra } from "./AshokaChakra"
import { ConfettiBurst } from "./ConfettiBurst"

/** How long the card sits there before bowing out on its own. */
const AUTO_DISMISS_MS = 6500

/**
 * The 15 August welcome: confetti out of both top corners behind a greeting
 * card, once per browser on the first console load of the day.
 *
 * Deliberately not a modal. There is no focus trap, no scrim that eats clicks
 * and no scroll lock — the overlay is `pointer-events-none` apart from the
 * card's own close button, so a user who loaded the console to go fix something
 * can carry straight on working through it. It also clears itself after
 * `AUTO_DISMISS_MS` for the user who walked away from the keyboard.
 */
export function IndependenceGreeting({ onDismiss }: Readonly<{ onDismiss: () => void }>) {
  const { t } = useTranslation()

  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => {
      clearTimeout(timer)
    }
  }, [onDismiss])

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-70 overflow-hidden"
    >
      <ConfettiBurst corner="left" />
      <ConfettiBurst corner="right" />

      <div className="flex h-full items-start justify-center px-4 pt-[18vh]">
        <div className="freedom-greeting-card pointer-events-auto relative flex max-w-md flex-col items-center gap-3 rounded-2xl px-8 py-7 text-center">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 size-7 text-muted-foreground hover:text-foreground"
            aria-label={t("seasonal.greeting.dismiss")}
            onClick={onDismiss}
          >
            <X className="size-3.5" />
          </Button>

          <AshokaChakra className="freedom-chakra size-9 text-[color:var(--freedom-navy)]" />

          <h2 className="freedom-greeting-title text-xl font-semibold tracking-tight sm:text-2xl">
            {t("seasonal.greeting.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("seasonal.greeting.welcome")}</p>
        </div>
      </div>
    </div>
  )
}
