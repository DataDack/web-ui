import { describe, expect, test } from "bun:test"
import { LayoutDashboard } from "lucide-react"

import {
  isItemActive,
  isItemActiveAmong,
  type SidebarNavItem,
} from "@/components/console/shell/sidebar-nav"
import { UNLIMITED } from "@/modules/hosting/hosting.constants"
import type { HostingAccount } from "@/modules/hosting/hosting.types"
import { accountNeedsAttention } from "@/modules/hosting/hosting.utils"
import type { Project } from "@/modules/managed-apps/managed-apps.types"
import { estateAttention } from "@/modules/managed-apps/partials/overview/EstateOverviewTab/estate-attention"
import { buildProjectEntries } from "@/modules/managed-apps/partials/overview/project-list"

/* ── Fixtures ──────────────────────────────────────────────────────────── */

function project(overrides: Partial<Project> & { id: string }): Project {
  return {
    name: overrides.id,
    subdomain: `${overrides.id}-abc`,
    url: `https://${overrides.id}.apps.example.cloud`,
    project_type: "react",
    plan: "basic",
    installation_id: 1,
    repo_owner: "acme",
    repo_name: overrides.id,
    repo_id: 1,
    branch: "main",
    root_dir: "",
    install_command: "",
    build_command: "",
    output_dir: "",
    status: "active",
    deploy_state: "awaiting_build",
    setup_state: "merged",
    setup_pr_number: 0,
    setup_pr_url: "",
    setup_branch: "",
    setup_error: "",
    workflow_version: 1,
    vpc_id: null,
    subnet_id: null,
    active_build_id: null,
    proxmox_ct_id: 0,
    container_ip: "",
    last_error: "",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Project
}

function account(overrides: Partial<HostingAccount> & { id: string }): HostingAccount {
  return {
    account_id: "acc-1",
    user_id: null,
    server_id: "srv-1",
    plan_sku: "starter",
    package_name: "starter",
    domain: `${overrides.id}.example.com`,
    username: overrides.id,
    dedicated_ip: "",
    status: "ACTIVE",
    suspension_reason: "",
    suspended_by: "",
    subscription_id: null,
    resource_urn: "",
    disk_used_mb: 100,
    disk_limit_mb: 10_000,
    bw_used_mb: 100,
    bw_limit_mb: 10_000,
    last_sync_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    nameservers: [],
    capabilities: [],
    provisioning: false,
    ...overrides,
  }
}

/** Only emptiness is read (see deriveProjectState), so this need not be an IP. */
const RUNTIME_ADDRESS = "ct-101"

const item = (path: string): SidebarNavItem => ({
  labelKey: path,
  icon: LayoutDashboard,
  path,
})

/* ── Sidebar: tabs addressed by query string ───────────────────────────── */

// Managed Apps' nav items point at tabs (?tab=apps, ?tab=hosting), not at
// distinct routes. Matching on the pathname alone would light every one of them
// at once, which is the whole reason isItemActive learned about query strings.
describe("query-bearing nav targets", () => {
  const overview = item("/managed-apps")
  const apps = item("/managed-apps?tab=apps")
  const hosting = item("/managed-apps?tab=hosting")
  const settings = item("/managed-apps/settings")
  const siblings = [overview, apps, hosting, settings]

  test("a tab item needs its param, not just the path", () => {
    expect(isItemActive("/managed-apps", apps.path, undefined, "?tab=apps")).toBe(true)
    expect(isItemActive("/managed-apps", apps.path, undefined, "")).toBe(false)
    expect(isItemActive("/managed-apps", apps.path, undefined, "?tab=hosting")).toBe(false)
  })

  test("params the target does not name are ignored, so a filtered tab still matches", () => {
    expect(isItemActive("/managed-apps", apps.path, undefined, "?tab=apps&state=failed")).toBe(true)
  })

  test("exactly one item is active per location", () => {
    const activeOn = (pathname: string, search: string) =>
      siblings.filter((candidate) => isItemActiveAmong(pathname, candidate, siblings, search))

    expect(activeOn("/managed-apps", "")).toEqual([overview])
    expect(activeOn("/managed-apps", "?tab=apps")).toEqual([apps])
    expect(activeOn("/managed-apps", "?tab=hosting")).toEqual([hosting])
    expect(activeOn("/managed-apps/settings", "")).toEqual([settings])
    // A project page has no ?tab, so it falls back to the section's Overview
    // rather than lighting nothing at all.
    expect(activeOn("/managed-apps/projects/p1", "")).toEqual([overview])
  })

  test("a target without a query is unaffected", () => {
    expect(isItemActive("/hosting/plans", "/hosting/plans")).toBe(true)
    expect(isItemActive("/hosting/abc", "/hosting")).toBe(true)
    expect(isItemActive("/hostingx", "/hosting")).toBe(false)
  })
})

/* ── Attention across both surfaces ────────────────────────────────────── */

describe("accountNeedsAttention", () => {
  test("an unlimited quota is never 'almost full'", () => {
    expect(
      accountNeedsAttention(
        account({ id: "a", disk_limit_mb: UNLIMITED, disk_used_mb: 9_000_000 }),
      ),
    ).toBe(false)
  })

  test("a quota in the red band counts, an amber one does not", () => {
    expect(accountNeedsAttention(account({ id: "a", disk_limit_mb: 100, disk_used_mb: 96 }))).toBe(
      true,
    )
    expect(accountNeedsAttention(account({ id: "a", disk_limit_mb: 100, disk_used_mb: 85 }))).toBe(
      false,
    )
  })

  test("suspended and failed always count", () => {
    expect(accountNeedsAttention(account({ id: "a", status: "SUSPENDED" }))).toBe(true)
    expect(accountNeedsAttention(account({ id: "a", status: "FAILED" }))).toBe(true)
    expect(accountNeedsAttention(account({ id: "a", status: "ACTIVE" }))).toBe(false)
  })
})

describe("estateAttention", () => {
  const entries = buildProjectEntries(
    [
      project({ id: "healthy", deploy_state: "live", container_ip: RUNTIME_ADDRESS }),
      project({ id: "broken", deploy_state: "failed", last_error: "build blew up" }),
      project({ id: "unmerged", deploy_state: "awaiting_setup", setup_state: "pr_open" }),
    ],
    new Map(),
  )

  test("spans both surfaces and names which one each row came from", () => {
    const items = estateAttention(entries, [
      account({ id: "ok" }),
      account({ id: "suspended", status: "SUSPENDED" }),
    ])

    expect(items.map((i) => i.id)).toContain("project:broken")
    expect(items.map((i) => i.id)).toContain("hosting:suspended")
    expect(items.find((i) => i.id === "hosting:suspended")?.surface).toBe("cPanel hosting")
    expect(items.find((i) => i.id === "project:broken")?.surface).toBe("Managed apps")
  })

  test("healthy resources are left out entirely", () => {
    const items = estateAttention(entries, [account({ id: "ok" })])
    expect(items.map((i) => i.id)).not.toContain("project:healthy")
    expect(items.map((i) => i.id)).not.toContain("hosting:ok")
    expect(items).toHaveLength(2)
  })

  test("most severe first, so the top of the panel is the thing to fix", () => {
    const items = estateAttention(entries, [account({ id: "suspended", status: "SUSPENDED" })])
    // failed (danger) outranks suspended (warning), which outranks an
    // unmerged setup PR (info).
    expect(items.map((i) => i.id)).toEqual([
      "project:broken",
      "hosting:suspended",
      "project:unmerged",
    ])
  })

  test("an unmerged setup PR links to the page that can finish it", () => {
    const items = estateAttention(entries, [])
    const unmerged = items.find((i) => i.id === "project:unmerged")
    expect(unmerged?.to).toBe("/managed-apps/projects/unmerged/setup")
  })

  test("nothing wrong means an empty list, not an all-clear row", () => {
    const healthy = buildProjectEntries(
      [project({ id: "healthy", deploy_state: "live", container_ip: RUNTIME_ADDRESS })],
      new Map(),
    )
    expect(estateAttention(healthy, [account({ id: "ok" })])).toEqual([])
  })
})
