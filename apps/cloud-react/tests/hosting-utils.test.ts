import { describe, expect, test } from "bun:test"

import { UNLIMITED } from "@/modules/hosting/hosting.constants"
import type { HostingAccount, HostingPlan } from "@/modules/hosting/hosting.types"
import {
  accountSummary,
  entryPrice,
  formatCount,
  formatLimitMB,
  formatMoney,
  formatWebsites,
  hasCapability,
  soldCycles,
  usagePct,
  usageTone,
} from "@/modules/hosting/hosting.utils"

// The unlimited sentinel is the thing most likely to be got wrong here, and the
// consequence is real: a customer on an unlimited plan seeing a full red disk
// bar, or a plan selling zero addon domains advertising unlimited ones.
describe("unlimited is never confused with none", () => {
  test("formatLimitMB distinguishes -1 from 0", () => {
    expect(formatLimitMB(UNLIMITED)).toBe("Unlimited")
    expect(formatLimitMB(0)).toBe("None")
    expect(formatLimitMB(UNLIMITED)).not.toBe(formatLimitMB(0))
  })

  test("formatCount distinguishes -1 from 0", () => {
    expect(formatCount(UNLIMITED)).toBe("Unlimited")
    expect(formatCount(0)).toBe("None")
    expect(formatCount(25)).toBe("25")
  })

  // The pricing card used to render String(addon_domains + 1), which turns the
  // sentinel into 0 — so the Infinity plan advertised "Websites 0" immediately
  // above its own "Unlimited websites" bullet.
  test("formatWebsites does not do arithmetic on the sentinel", () => {
    expect(formatWebsites(UNLIMITED)).toBe("Unlimited")
    expect(formatWebsites(UNLIMITED)).not.toBe("0")
  })

  // The count is addons PLUS the primary domain, which is what makes the
  // Starter plan honestly advertise two sites off a single addon.
  test("formatWebsites counts the primary domain too", () => {
    expect(formatWebsites(0)).toBe("1")
    expect(formatWebsites(1)).toBe("2")
    expect(formatWebsites(3)).toBe("4")
    expect(formatWebsites(8)).toBe("9")
  })

  test("usagePct has no percentage to report without a ceiling", () => {
    expect(usagePct(500, UNLIMITED)).toBeNull()
    // A limit of 0 is also unrenderable as a bar — dividing by it would give
    // Infinity, which the UI would draw as a full bar on an empty account.
    expect(usagePct(0, 0)).toBeNull()
  })
})

describe("formatLimitMB scales units", () => {
  test("megabytes stay megabytes", () => {
    expect(formatLimitMB(512)).toBe("512 MB")
  })

  test("gigabytes and terabytes are scaled", () => {
    expect(formatLimitMB(1024)).toBe("1 GB")
    expect(formatLimitMB(10240)).toBe("10 GB")
    expect(formatLimitMB(1024 * 1024)).toBe("1 TB")
  })

  test("fractional values keep one decimal rather than rounding to nothing", () => {
    expect(formatLimitMB(1536)).toBe("1.5 GB")
  })
})

describe("usagePct and usageTone", () => {
  test("percentage is clamped so an over-quota account does not overflow the bar", () => {
    expect(usagePct(200, 100)).toBe(100)
    expect(usagePct(50, 100)).toBe(50)
  })

  test("tone escalates at the thresholds the bars are coloured by", () => {
    expect(usageTone(10)).toBe("ok")
    expect(usageTone(79)).toBe("ok")
    expect(usageTone(80)).toBe("warn")
    expect(usageTone(94)).toBe("warn")
    expect(usageTone(95)).toBe("danger")
    // No ceiling is not a problem, so it must not read as one.
    expect(usageTone(null)).toBe("ok")
  })
})

describe("pricing", () => {
  test("entryPrice picks the cheapest cycle that is actually sold", () => {
    const plan = planWith({ monthly: 149, quarterly: 399, annual: 1299 })
    expect(entryPrice(plan)).toEqual({ amount: 149, cycle: "monthly" })
  })

  test("a zero price means the cycle is not offered, so it is never chosen", () => {
    const plan = planWith({ monthly: 0, quarterly: 399, annual: 1299 })
    expect(entryPrice(plan)).toEqual({ amount: 399, cycle: "quarterly" })
  })

  test("an unpriced plan has no entry price at all", () => {
    expect(entryPrice(planWith({}))).toBeNull()
  })

  test("soldCycles lists only the priced ones", () => {
    expect(soldCycles(planWith({ monthly: 149, annual: 1299 }))).toEqual(["monthly", "annual"])
    expect(soldCycles(planWith({}))).toEqual([])
  })

  test("formatMoney survives an unknown currency rather than blanking the price", () => {
    const out = formatMoney(149, "XYZ")
    expect(out).toContain("149")
  })
})

describe("accountSummary", () => {
  test("work in flight is reported ahead of the settled status", () => {
    // An account can be ACTIVE with a suspension queued. Saying only "live"
    // while the site is about to go off would be a lie of omission.
    const account = accountWith({ status: "ACTIVE", provisioning: true })
    expect(accountSummary(account)).toContain("in progress")
  })

  test("a suspension carries its reason when there is one", () => {
    const account = accountWith({ status: "SUSPENDED", suspension_reason: "payment overdue" })
    expect(accountSummary(account)).toContain("payment overdue")
  })

  test("a suspension without a reason still reads sensibly", () => {
    expect(accountSummary(accountWith({ status: "SUSPENDED" }))).toBe("Suspended")
  })

  test("a failed setup does not leave the customer guessing", () => {
    expect(accountSummary(accountWith({ status: "FAILED" }))).toContain("failed")
  })
})

describe("hasCapability", () => {
  test("reads the module's declared action set", () => {
    const account = accountWith({ capabilities: ["sso", "usage"] })
    expect(hasCapability(account, "sso")).toBe(true)
    expect(hasCapability(account, "terminate")).toBe(false)
  })

  test("an account whose module declared nothing fails closed", () => {
    // A server row naming a panel this build does not know reports no
    // capabilities at all, and the right answer for every action is "no".
    expect(hasCapability(accountWith({ capabilities: [] }), "sso")).toBe(false)
  })
})

function planWith(pricing: Partial<HostingPlan["pricing"]>): HostingPlan {
  return {
    sku: "starter",
    group: "shared",
    name: "Starter",
    description: "",
    module_key: "cpanel",
    server_group: "",
    whm_package: "starter_pkg",
    limits: {
      disk_mb: 10240,
      bandwidth_mb: 512000,
      addon_domains: 1,
      subdomains: 25,
      parked_domains: 5,
      email_accounts: 50,
      databases: 10,
      ftp_accounts: 5,
      cpu_pct: 100,
      iops: 1024,
      entry_procs: 20,
    },
    features: [],
    pricing: { currency: "INR", monthly: 0, quarterly: 0, annual: 0, setup_fee: 0, ...pricing },
    auto_setup: "on_payment",
    visible: true,
    sort_order: 10,
    retired: false,
  }
}

function accountWith(overrides: Partial<HostingAccount>): HostingAccount {
  return {
    id: "acc-1",
    account_id: "tenant-1",
    user_id: null,
    server_id: "srv-1",
    plan_sku: "starter",
    package_name: "starter_pkg",
    domain: "example.com",
    username: "example",
    dedicated_ip: "",
    status: "ACTIVE",
    suspension_reason: "",
    suspended_by: "",
    subscription_id: null,
    resource_urn: "",
    disk_used_mb: 0,
    disk_limit_mb: 10240,
    bw_used_mb: 0,
    bw_limit_mb: 512000,
    last_sync_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    nameservers: [],
    capabilities: [],
    provisioning: false,
    ...overrides,
  }
}
