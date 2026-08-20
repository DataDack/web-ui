import type { PromoScope } from "./promotions.types"

export const PROMO_QUERY_KEYS = {
  // Operator caches are separate from the tenant ones: they hold every campaign
  // on the platform, which is not something a tenant read should ever be able to
  // populate or invalidate.
  codes: ["superadmin", "promo-codes"] as const,
  stats: ["superadmin", "promo-stats"] as const,
  redemptions: (id: string) => ["superadmin", "promo-redemptions", id] as const,

  // Tenant caches sit under "billing" so the billing section's refresh button
  // (which invalidates the whole "billing" key) picks them up for free.
  mine: ["billing", "promotions", "mine"] as const,
  wallet: ["billing", "promotions", "wallet"] as const,
}

/** Every resource kind a percent-off code can be scoped to, in menu order. */
export const PROMO_SCOPES: PromoScope[] = [
  "compute",
  "storage",
  "network",
  "loadbalancer",
  "hosting",
  "managedapps",
]

/**
 * Build the shareable redeem link for a code.
 *
 * Same origin as the console the operator is looking at, because the admin and
 * tenant surfaces are one app — which also means the link works in whichever
 * environment it was copied from, instead of always pointing at production.
 *
 * The tenant page reads ?code= , pre-fills the box and previews it. Signed-out
 * visitors hit the login redirect first and land back here afterwards, so the
 * link is safe to put in an email.
 */
export function promoShareLink(code: string): string {
  return `${window.location.origin}/billing/promotions?code=${encodeURIComponent(code)}`
}

/** The query param the shareable link carries. */
export const PROMO_CODE_PARAM = "code"
