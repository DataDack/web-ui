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

/** Independence Day itself — the greeting fires on this day and no other. */
const GREETING_MONTH = 7
const GREETING_DAY = 15

const GREETING_KEY = `console-independence-greeting-${String(FREEDOM_SALE_YEAR)}`

/** True while the seasonal window is open. */
export function isFreedomSaleActive(now: Date = new Date()): boolean {
  return now >= WINDOW_START && now < WINDOW_END
}

/** True on 15 August only. */
export function isIndependenceDay(now: Date = new Date()): boolean {
  return (
    now.getFullYear() === FREEDOM_SALE_YEAR &&
    now.getMonth() === GREETING_MONTH &&
    now.getDate() === GREETING_DAY
  )
}

/**
 * localStorage, but never at the cost of a render. Private-mode Safari and
 * hardened browser profiles throw on access; a decoration that reappears beats
 * a console that white-screens.
 */
function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "true"
  } catch {
    return false
  }
}

function writeFlag(key: string): void {
  try {
    localStorage.setItem(key, "true")
  } catch {
    // Non-persistent is still good enough for this session.
  }
}

function wasDismissed(): boolean {
  return readFlag(DISMISS_KEY)
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
    writeFlag(DISMISS_KEY)
  }, [])

  return { active, bannerVisible: active && !dismissed, dismiss }
}

/**
 * The once-a-year greeting: confetti from both top corners behind a "Happy
 * Independence Day" card, on 15 August, on the first console load of the day
 * and not again.
 *
 * "First load" is per browser, not per tab or per session — the flag is
 * written the moment it renders, so a reload, a second tab, or a navigation
 * back to the console later that day all stay quiet. Someone who genuinely
 * wants it again can clear the key; that is a fair price for not ambushing a
 * user who is trying to work.
 */
export function useIndependenceGreeting(): { show: boolean; dismiss: () => void } {
  const [show, setShow] = useState(() => isIndependenceDay() && !readFlag(GREETING_KEY))

  // Burn the flag on first paint rather than on dismiss: if the user closes
  // the tab mid-animation, it still counts as having been shown.
  useEffect(() => {
    if (show) writeFlag(GREETING_KEY)
  }, [show])

  const dismiss = useCallback(() => {
    setShow(false)
  }, [])

  return { show, dismiss }
}
