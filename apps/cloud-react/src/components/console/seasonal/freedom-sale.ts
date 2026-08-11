import { useCallback, useEffect, useState } from "react"

/**
 * Independence Day / Freedom Sale seasonal treatment.
 *
 * Everything festive in the console — the top banner, the tricolour rule under
 * the topbar, the glow behind the logo — is gated on the one window below.
 * Outside it the console renders exactly as it does the rest of the year, so
 * this ships now and takes itself down; nobody has to remember a follow-up PR.
 *
 * To run it again next August, bump `FREEDOM_SALE_YEAR`. The dismissal key is
 * year-scoped, so a user who closed the banner in 2026 still sees the 2027 one.
 */

/** The year the window below belongs to. Bump this to re-run the campaign. */
export const FREEDOM_SALE_YEAR = 2026

/** Inclusive first day of the window — 8 August, 00:00 local time. */
const WINDOW_START = new Date(FREEDOM_SALE_YEAR, 7, 8)

/**
 * Exclusive end — 17 August, 00:00 local time, i.e. the treatment is live
 * through the whole of the 16th and gone on the 17th.
 *
 * Local time, not IST: a console open in another timezone flips a few hours
 * off from Delhi, which is the right trade for a decoration. Nothing here
 * gates a price or an entitlement — the sale itself is enforced server-side.
 */
const WINDOW_END = new Date(FREEDOM_SALE_YEAR, 7, 17)

const DISMISS_KEY = `console-freedom-sale-dismissed-${String(FREEDOM_SALE_YEAR)}`

/** True while the seasonal window is open. */
export function isFreedomSaleActive(now: Date = new Date()): boolean {
  return now >= WINDOW_START && now < WINDOW_END
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "true"
  } catch {
    // Private-mode Safari and friends throw on localStorage access. A banner
    // that reappears beats a console that crashes.
    return false
  }
}

/**
 * Whether the seasonal chrome should render, and how to close it.
 *
 * `active` drives the ambient accents (rule, glow) — those have no dismiss of
 * their own. `bannerVisible` additionally respects the user's X.
 *
 * The window is re-checked when the tab becomes visible again so a console
 * left open over the night of the 16th doesn't keep flying the banner.
 */
export function useFreedomSale(): {
  active: boolean
  bannerVisible: boolean
  dismiss: () => void
} {
  const [active, setActive] = useState(isFreedomSaleActive)
  const [dismissed, setDismissed] = useState(wasDismissed)

  useEffect(() => {
    if (!active) return
    const recheck = () => {
      setActive(isFreedomSaleActive())
    }
    document.addEventListener("visibilitychange", recheck)
    return () => {
      document.removeEventListener("visibilitychange", recheck)
    }
  }, [active])

  const dismiss = useCallback(() => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, "true")
    } catch {
      // Non-persistent dismissal is still a dismissal for this session.
    }
  }, [])

  return { active, bannerVisible: active && !dismissed, dismiss }
}
