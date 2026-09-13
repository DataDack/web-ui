import { describe, expect, test } from "bun:test"

import { STORAGE_KEYS } from "@/services/api/storage-keys"

// These names are what a returning user's session is found under. A build that
// sets none of the VITE_* overrides has to produce exactly the names the
// console has always written, or every existing session is orphaned on the next
// deploy: the old keys stay in the browser and nothing reads them.
describe("STORAGE_KEYS", () => {
  test("falls back to the names the console has always used", () => {
    expect(STORAGE_KEYS).toEqual({
      refreshToken: "refresh-token",
      activeScope: "active-scope",
      deviceId: "dd.deviceId",
      scopeReset: "dd:scope-reset",
    })
  })

  test("every key is distinct", () => {
    const names = Object.values(STORAGE_KEYS)
    expect(new Set(names).size).toBe(names.length)
  })

  test("no key is blank", () => {
    // A blank key is not an error anything reports: localStorage happily stores
    // under "" and the value is simply never found again.
    for (const name of Object.values(STORAGE_KEYS)) {
      expect(name.trim().length).toBeGreaterThan(0)
    }
  })
})
