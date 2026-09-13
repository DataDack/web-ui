import { describe, expect, test } from "bun:test"

import { STORAGE_KEYS } from "../src/lib/storage-keys"

// A build that sets no VITE_STORAGE_PREFIX has to produce exactly the names this
// console has always written, or every operator is signed out and loses their
// configured API base on the next deploy: the old keys stay in localStorage and
// nothing reads them.
describe("STORAGE_KEYS", () => {
  test("falls back to the names the console has always used", () => {
    expect(STORAGE_KEYS).toEqual({
      apiBase: "faas.admin.apiBase",
      token: "faas.admin.token",
      legacyTokenExpiry: "faas.admin.tokenExpiresAt",
      accountId: "faas.admin.accountId",
      resourceGroupId: "faas.admin.resourceGroupId",
    })
  })

  test("every key is distinct and namespaced", () => {
    const names = Object.values(STORAGE_KEYS)
    expect(new Set(names).size).toBe(names.length)
    for (const name of names) {
      expect(name.startsWith("faas.admin.")).toBe(true)
    }
  })
})
