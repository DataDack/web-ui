import { describe, expect, test } from "bun:test"

import {
  type NavModuleState,
  navItemStateForPath,
} from "../src/components/console/shell/sidebar-nav"

const states = (entries: Record<string, NavModuleState>) => new Map(Object.entries(entries))

describe("navItemStateForPath", () => {
  const prod = states({
    "networking/vpc": "enabled",
    "networking/vpn": "coming_soon",
    "networking/ipsec": "coming_soon",
    "domains/registeredDomains": "coming_soon",
    "domains/hostnames": "enabled",
    "domains/cpanelHosting": "enabled",
  })

  test("a coming-soon item closes its own page", () => {
    expect(navItemStateForPath("/networking/vpn", prod)?.state).toBe("coming_soon")
    expect(navItemStateForPath("/networking/ipsec", prod)?.state).toBe("coming_soon")
  })

  test("a nested item resolves to itself, not to its parent", () => {
    // /networking/vpn is under the VPCs item's /networking prefix; VPCs stays open.
    expect(navItemStateForPath("/networking", prod)?.state).toBe("enabled")
    expect(navItemStateForPath("/networking/vpn", prod)?.item.labelKey).toBe(
      "console.nav.items.vpn",
    )
  })

  test("a closed parent does not swallow open siblings", () => {
    expect(navItemStateForPath("/domains", prod)?.state).toBe("coming_soon")
    expect(navItemStateForPath("/domains/hostnames", prod)?.state).toBe("enabled")
    expect(navItemStateForPath("/domains/hosting", prod)?.state).toBe("enabled")
  })

  test("no opinion when the catalog is empty or has no row", () => {
    expect(navItemStateForPath("/networking/vpn", new Map())).toBeUndefined()
    expect(navItemStateForPath("/networking/subnets", prod)).toBeUndefined()
    expect(navItemStateForPath("/accounts", prod)).toBeUndefined()
  })
})
