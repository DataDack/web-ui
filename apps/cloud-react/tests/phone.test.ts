import { describe, expect, test } from "bun:test"

import {
  isValidNationalNumber,
  normalizeNationalNumber,
  sanitizePhoneEntry,
} from "@/modules/auth/phone"
import type { Country } from "@/modules/countries/countries.types"

function country(overrides: Partial<Country> & { iso2: string }): Country {
  return {
    name: overrides.iso2,
    currency_code: "INR",
    currency_symbol: "₹",
    dial_code: "91",
    flag: "🇮🇳",
    nsn_lengths: [10],
    ...overrides,
  }
}

// Mobiles are 10 digits starting 6-9; the 0 people dial in front is a trunk
// prefix and never part of the number.
const IN = country({ iso2: "IN", phone_pattern: "^[6-9]\\d{9}$" })

// The standing exception: Italian landlines keep their leading zero, so the
// same input must survive untouched.
const IT = country({
  iso2: "IT",
  dial_code: "39",
  currency_code: "EUR",
  currency_symbol: "€",
  flag: "🇮🇹",
  nsn_lengths: [9, 10, 11],
  phone_pattern: "^(?:0\\d{8,10}|3\\d{8,9})$",
})

// No pattern to consult — the near-universal trunk-prefix rule applies.
const NO_PATTERN = country({ iso2: "XX", nsn_lengths: [] })

describe("normalizeNationalNumber", () => {
  test("drops the national trunk prefix", () => {
    expect(normalizeNationalNumber("09039515936", IN)).toBe("9039515936")
  })

  test("leaves a number that never had one alone", () => {
    expect(normalizeNationalNumber("9039515936", IN)).toBe("9039515936")
  })

  test("still strips a pasted dial code, with or without formatting", () => {
    expect(normalizeNationalNumber("+91 90395 15936", IN)).toBe("9039515936")
    expect(normalizeNationalNumber("00919039515936", IN)).toBe("9039515936")
  })

  test("keeps the leading zero where it is part of the number", () => {
    expect(normalizeNationalNumber("0612345678", IT)).toBe("0612345678")
  })

  test("assumes a trunk prefix when the country declares no pattern", () => {
    expect(normalizeNationalNumber("0123456789", NO_PATTERN)).toBe("123456789")
  })

  test("a stripped number validates — which is the point", () => {
    expect(isValidNationalNumber(IN, normalizeNationalNumber("09039515936", IN))).toBe(true)
    expect(isValidNationalNumber(IT, normalizeNationalNumber("0612345678", IT))).toBe(true)
  })
})

describe("sanitizePhoneEntry", () => {
  test("removes the leading zero as it is typed", () => {
    expect(sanitizePhoneEntry("09039515936", IN)).toBe("9039515936")
    expect(sanitizePhoneEntry("0", IN)).toBe("")
  })

  test("preserves the user's own formatting", () => {
    expect(sanitizePhoneEntry("090395 15936", IN)).toBe("90395 15936")
    expect(sanitizePhoneEntry("9039515936", IN)).toBe("9039515936")
  })

  test("leaves an international 00-prefix alone — it is not a trunk prefix", () => {
    expect(sanitizePhoneEntry("00919039515936", IN)).toBe("00919039515936")
  })

  test("leaves Italian numbers untouched", () => {
    expect(sanitizePhoneEntry("0612345678", IT)).toBe("0612345678")
  })

  test("does not disturb a number with no leading zero", () => {
    expect(sanitizePhoneEntry("+91 90395", IN)).toBe("+91 90395")
  })
})
