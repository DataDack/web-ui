import { describe, expect, test } from "bun:test"

import { findServiceByPath } from "../src/components/console/shell/sidebar-nav"
import { gateForPath } from "../src/modules/services/catalog.gate"
import type { CatalogService } from "../src/modules/services/catalog.types"

const service = (key: string, path: string, status: CatalogService["status"] = "operational"): CatalogService => ({
  id: key.length, key, path, status, name: key, short_name: key, description: "", icon: "Layers",
  category: "network", state: "enabled", sort_order: 0, metrics: [],
})
const traffic = service("traffic", "/networking/api-gateway")
const routes = ["/networking/api-gateway", "/networking/api-gateway/create", "/networking/api-gateway/123", "/compute/load-balancers", "/compute/load-balancers/create", "/compute/load-balancers/123", "/compute/target-groups/123"]

describe("combined Load Balancer & API Gateway service", () => {
  test("one admin record controls both features independently of compute and networking", () => {
    const catalog = [service("compute", "/compute", "maintenance"), service("vpc", "/networking", "maintenance"), traffic]
    for (const path of routes) expect(gateForPath(path, catalog)).toBe("active")
    expect(gateForPath("/compute/instances", catalog)).toBe("maintenance")
    expect(gateForPath("/networking/subnets", catalog)).toBe("maintenance")
  })
  test("maintenance closes both features together", () => {
    const catalog = [service("compute", "/compute"), service("vpc", "/networking"), { ...traffic, status: "maintenance" as const }]
    for (const path of routes) expect(gateForPath(path, catalog)).toBe("maintenance")
    expect(gateForPath("/compute/instances", catalog)).toBe("active")
    expect(gateForPath("/networking/subnets", catalog)).toBe("active")
  })
  test("coming soon applies to both features", () => {
    for (const path of routes) expect(gateForPath(path, [{ ...traffic, state: "coming_soon" }])).toBe("maintenance")
  })
  test("all pages share their own sidebar with both feature sections", () => {
    for (const path of routes) expect(findServiceByPath(path)?.key).toBe("traffic")
    const sidebar = findServiceByPath(routes[0])
    expect(sidebar?.items.map((item) => item.path)).toEqual(["/networking/api-gateway", "/compute/load-balancers"])
    expect(findServiceByPath("/compute/instances")?.items.some((item) => item.path === "/compute/load-balancers")).toBe(false)
    expect(findServiceByPath("/networking/subnets")?.items.some((item) => item.path === "/networking/api-gateway")).toBe(false)
  })
})
