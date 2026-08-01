export const ONBOARDING_ROUTE = "/onboarding"

// Country options are served by the backend `GET /api/v1/countries` route and
// consumed via `useCountries()` — see modules/countries.

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Puducherry",
  "Chandigarh",
] as const

// Client-side mirrors of the backend Indian-format validators (instant feedback).
export const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/
export const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][\dA-Z]Z[\dA-Z]$/
export const CIN_RE = /^[LUu]\d{5}[A-Za-z]{2}\d{4}[A-Za-z]{3}\d{6}$/
export const PINCODE_RE = /^[1-9]\d{5}$/

export const isIndia = (country: string) => country.toUpperCase() === "IN"

// Minimum account-holder age — individuals must be at least this old.
export const MIN_AGE_YEARS = 18

/** Latest birth year that can possibly satisfy {@link MIN_AGE_YEARS} today. */
export const maxBirthYear = (today = new Date()) => today.getFullYear() - MIN_AGE_YEARS

/**
 * Whether an ISO `yyyy-mm-dd` birthdate is at least {@link MIN_AGE_YEARS} old
 * as of `today` (calendar-accurate, accounts for the birthday not yet passed).
 */
export const isOldEnough = (iso: string, today = new Date()): boolean => {
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return false
  const eighteenth = new Date(y + MIN_AGE_YEARS, m - 1, d)
  return eighteenth <= today
}
