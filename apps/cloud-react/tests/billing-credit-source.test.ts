import { describe, expect, it } from "bun:test"
import { creditSourceLabel } from "../src/modules/billing/billing.utils"

describe("credit provenance labels", () => {
  const credit = { kind: "credit" as const, ref_type: "adjustment", reason: "", description: "Provided for evaluation" }
  it("identifies trial, goodwill and admin credits without describing them as purchases", () => {
    expect(creditSourceLabel({ ...credit, reason: "trial_bonus" })).toBe("Trial promotional credit")
    expect(creditSourceLabel({ ...credit, reason: "goodwill" })).toBe("Admin-provided goodwill credit")
    expect(creditSourceLabel(credit)).toBe("Admin-provided credit")
  })
  it("distinguishes purchased credits, coupons and returned resource charges", () => {
    expect(creditSourceLabel({ ...credit, ref_type: "topup" })).toBe("Purchased credits")
    expect(creditSourceLabel({ ...credit, ref_type: "promo" })).toBe("Promotional coupon credit")
    expect(creditSourceLabel({ ...credit, reason: "resource_reversal" })).toBe("Resource charge returned")
    expect(creditSourceLabel({ ...credit, description: "Reversal — VM create failed" })).toBe("Resource charge returned")
  })
})
