import { afterEach, beforeEach, describe, expect, test } from "bun:test"

import { clearKycSkip, isKycSkipped, skipKycForNow } from "@/modules/onboarding/kyc-skip"

const USER_ID = "user-123"
const START = new Date("2026-09-02T08:00:00.000Z").getTime()
const realDateNow = Date.now

describe("KYC skip window", () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    Date.now = () => START
  })

  afterEach(() => {
    Date.now = realDateNow
  })

  test("survives refresh storage checks for four hours", () => {
    skipKycForNow(USER_ID)

    Date.now = () => START + 4 * 60 * 60 * 1000 - 1
    expect(isKycSkipped(USER_ID)).toBe(true)
  })

  test("expires after four hours and removes the stored value", () => {
    skipKycForNow(USER_ID)

    Date.now = () => START + 4 * 60 * 60 * 1000
    expect(isKycSkipped(USER_ID)).toBe(false)
    expect(localStorage.getItem(`kyc-skip:${USER_ID}`)).toBeNull()
  })

  test("keeps skips isolated per user", () => {
    skipKycForNow(USER_ID)

    expect(isKycSkipped("another-user")).toBe(false)
  })

  test("clears current and legacy skip values after verification", () => {
    skipKycForNow(USER_ID)
    sessionStorage.setItem(`kyc-skip:${USER_ID}`, "1")

    clearKycSkip(USER_ID)

    expect(isKycSkipped(USER_ID)).toBe(false)
    expect(sessionStorage.getItem(`kyc-skip:${USER_ID}`)).toBeNull()
  })
})
