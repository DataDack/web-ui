import { useCallback, useMemo, useState } from "react"

import { useCountries } from "@/modules/countries/countries.hooks"
import type { Country } from "@/modules/countries/countries.types"

// Mobile-number entry shared by every surface that collects one (the legacy
// MobileNumberPrompt dialog and the OAuth account-creation step). The user types
// a national significant number and picks a dial code; we submit the combined
// E.164 value, which is what the API's phone validator expects.

function digitsOnly(value: string) {
    return value.replace(/\D/g, "")
}

/**
 * Whether a leading 0 is part of this country's numbers rather than a trunk
 * prefix to be dropped.
 *
 * Almost everywhere the 0 in "09039515936" is a national dialling prefix and
 * not part of the number — E.164 excludes it. Italy is the standing exception:
 * "06…" landlines keep theirs, and blanket-stripping would corrupt every
 * Italian number entered.
 *
 * Rather than hardcode that list, ask the country's own pattern whether any
 * zero-leading number of an accepted length can match it. The probes are
 * "0" followed by one repeated digit, which is enough for the shape of these
 * patterns (a leading-character class followed by a length quantifier) and
 * cheap: ten strings per accepted length, memoized per country.
 */
const leadingZeroCache = new Map<string, boolean>()

function probeLeadingZero(source: string, nsnLengths: number[]): boolean {
    try {
        const pattern = new RegExp(source)
        // No declared lengths: probe the plausible NSN range instead.
        const lengths = nsnLengths.length > 0 ? nsnLengths : [6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
        return lengths.some((length) =>
            "0123456789"
                .split("")
                .some((digit) => pattern.test(`0${digit.repeat(Math.max(0, length - 1))}`))
        )
    } catch {
        // A malformed pattern must not decide this either way; keep the number
        // as typed and let the server have the final say.
        return true
    }
}

function keepsLeadingZero(country?: Country): boolean {
    // No pattern to consult — assume the near-universal rule (trunk prefix).
    if (!country?.phone_pattern) return false

    const key = `${country.iso2}:${country.phone_pattern}`
    const cached = leadingZeroCache.get(key)
    if (cached !== undefined) return cached

    const keeps = probeLeadingZero(country.phone_pattern, country.nsn_lengths)
    leadingZeroCache.set(key, keeps)
    return keeps
}

/** Drops the national trunk prefix ("09039515936" → "9039515936"), unless the
 *  country keeps its leading zero. Input is digits only. */
function stripTrunkPrefix(digits: string, country?: Country) {
    if (!digits.startsWith("0") || keepsLeadingZero(country)) return digits
    return digits.replace(/^0+/, "")
}

/** Strips a dial code the user pasted in front of their national number, so
 *  "+919876543210", "00919876543210", "09039515936" and "9876543210" all
 *  normalize alike. */
export function normalizeNationalNumber(raw: string, country?: Country) {
    const digits = digitsOnly(raw)
    if (!country?.dial_code) return stripTrunkPrefix(digits, country)

    const dialCode = country.dial_code
    const internationalPrefix = `00${dialCode}`
    if (digits.startsWith(internationalPrefix)) {
        return digits.slice(internationalPrefix.length)
    }
    if (digits.length > dialCode.length && digits.startsWith(dialCode)) {
        return digits.slice(dialCode.length)
    }
    return stripTrunkPrefix(digits, country)
}

/**
 * What the field should show for what was just typed or pasted.
 *
 * Only the trunk prefix is removed; everything else is left exactly as entered,
 * because the field is a text box people format their own way (spaces, dashes,
 * a leading +) and rewriting that mid-typing fights them.
 *
 * "00<dial code>" is left alone: it is an international prefix, not a trunk
 * prefix, and normalizeNationalNumber already understands it.
 */
export function sanitizePhoneEntry(raw: string, country?: Country) {
    const digits = digitsOnly(raw)
    if (!digits.startsWith("0")) return raw
    if (country?.dial_code && digits.startsWith(`00${country.dial_code}`)) return raw
    if (keepsLeadingZero(country)) return raw
    // Zeros only at the very front, after any punctuation the user typed.
    return raw.replace(/^(\D*)0+/, "$1")
}

function hasAcceptedLength(country: Country, nationalNumber: string) {
    return country.nsn_lengths.length === 0 || country.nsn_lengths.includes(nationalNumber.length)
}

function matchesCountryPattern(country: Country, nationalNumber: string) {
    if (!country.phone_pattern) return true
    try {
        return new RegExp(country.phone_pattern).test(nationalNumber)
    } catch {
        // A malformed pattern from the API must not block a plausible number;
        // the server validates again anyway.
        return true
    }
}

export function isValidNationalNumber(country: Country | undefined, nationalNumber: string) {
    if (!country || !/^\d+$/.test(nationalNumber)) return false
    return (
        hasAcceptedLength(country, nationalNumber) && matchesCountryPattern(country, nationalNumber)
    )
}

export function placeholderForCountry(country: Country | undefined, fallback: string) {
    switch (country?.iso2) {
        case "IN":
            return "98765 43210"
        case "US":
        case "CA":
            return "201 555 0123"
        case "GB":
            return "7123 456789"
        case "AU":
            return "412 345 678"
        default:
            return fallback
    }
}

export interface PhoneInputState {
    countryIso: string
    setCountryIso: (iso: string) => void
    raw: string
    setRaw: (value: string) => void
    selectedCountry: Country | undefined
    /** The normalized national number, dial code stripped. */
    nationalNumber: string
    /** Full E.164 number to submit, or "" when the entry is not yet valid. */
    e164: string
    isValid: boolean
    /** "+91 9876543210" once valid, otherwise "" — for the helper line. */
    formattedPreview: string
    countriesLoading: boolean
    countriesFailed: boolean
}

/** Owns dial-code + national-number state and derives the E.164 value.
 *  `initialRaw` prefills the entry (e.g. the stored E.164 number — the dial
 *  code is normalized away against the selected country). */
export function usePhoneInput(defaultCountryIso = "IN", initialRaw = ""): PhoneInputState {
    const {
        data: countries = [],
        isError: countriesFailed,
        isLoading: countriesLoading,
    } = useCountries()

    const fallbackIso = defaultCountryIso.toUpperCase()
    const [countryIso, setCountryIso] = useState(fallbackIso)
    const [raw, setRawValue] = useState(initialRaw)

    const selectedCountry = useMemo<Country | undefined>(
        () =>
            countries.find((c) => c.iso2 === countryIso) ??
            countries.find((c) => c.iso2 === fallbackIso) ??
            countries.find((c) => c.iso2 === "IN") ??
            countries.at(0),
        [countries, countryIso, fallbackIso]
    )

    // The trunk prefix is dropped on the way IN, not just at validation time:
    // typing a leading 0 that silently fails the length check later reads as the
    // form rejecting a number the user knows is correct.
    const setRaw = useCallback(
        (value: string) => {
            setRawValue(sanitizePhoneEntry(value, selectedCountry))
        },
        [selectedCountry]
    )

    const nationalNumber = useMemo(
        () => normalizeNationalNumber(raw, selectedCountry),
        [raw, selectedCountry]
    )

    const isValid = isValidNationalNumber(selectedCountry, nationalNumber)
    const e164 = isValid && selectedCountry ? `+${selectedCountry.dial_code}${nationalNumber}` : ""

    return {
        countryIso,
        setCountryIso,
        raw,
        setRaw,
        selectedCountry,
        nationalNumber,
        e164,
        isValid,
        formattedPreview:
            isValid && selectedCountry ? `+${selectedCountry.dial_code} ${nationalNumber}` : "",
        countriesLoading,
        countriesFailed,
    }
}
