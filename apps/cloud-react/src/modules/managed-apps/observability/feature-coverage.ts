/**
 * What the platform SELLS, against what it can actually MEASURE today.
 *
 * Every row here is a line item on the pricing sheet. `source` says where its
 * usage number comes from, or that nothing measures it yet. That second case is
 * the point of this file: a metered feature nobody meters is a support ticket
 * and a refund waiting to happen, and the only thing worse than not having the
 * number is not knowing that you do not have it.
 *
 * ── The rule this file enforces ──────────────────────────────────────────────
 *
 * A tile whose usage is not measured shows the ENTITLEMENT — what the customer
 * bought — and says plainly that usage is not being metered yet. It never shows
 * a plausible-looking number. That distinction is not pedantry: these screens
 * are shown to prospects, and a fabricated usage figure in a sales demo is a
 * claim about a system that does not exist. The entitlement is true and worth
 * showing; the usage is not known and must say so.
 *
 * Keeping the honest version also makes this list a work queue. Flip a row from
 * `pending` to a real source as each meter lands, and the dashboard fills in on
 * its own.
 */

/** Where a usage figure comes from. */
export type CoverageSource =
  /** A real measurement the platform takes today. */
  | "measured"
  /** Sold and enforced, but nothing records consumption yet. */
  | "pending"
  /**
   * There is no usage to measure — the feature is a capability or a ceiling,
   * not a meter. "SAML SSO: false" and "request timeout: 60s" are facts about
   * the plan, complete as they stand.
   */
  | "entitlement"

export interface FeatureCoverage {
  /** Pricing-sheet slug, as it appears in `Plan.values`. */
  slug: string
  label: string
  group: FeatureGroup
  source: CoverageSource
  /**
   * INTERNAL ONLY — never rendered to a customer.
   *
   * For `measured`: where the number is read from, so an engineer can find it.
   * For `pending`: what has to exist before it can be measured. This is the
   * field that turns the list into a work queue, and it names infrastructure,
   * environment variables and internal services on purpose. A console shows
   * customers what the platform does for them, not which of our components is
   * not wired up yet — so this string must stay out of the UI. Anything a
   * customer should read goes in `customerNote`.
   */
  note: string
  /**
   * The customer-facing sentence, when a tile needs one. Describes the effect
   * on THEM in their language, with no internal component named.
   */
  customerNote?: string
}

export type FeatureGroup =
  "projects" | "security" | "compute" | "edge" | "build" | "governance" | "observability"

export const FEATURE_GROUP_LABELS: Record<FeatureGroup, string> = {
  projects: "Projects & environments",
  security: "Environment & preview security",
  compute: "Compute & execution",
  edge: "Edge network & bandwidth",
  build: "Build & deploy",
  governance: "Security & governance",
  observability: "Observability & support",
}

/**
 * The coverage table.
 *
 * Ordered by pricing-sheet group so this file can be read side by side with the
 * sheet itself — which is the only way it stays correct as the sheet changes.
 */
export const FEATURE_COVERAGE: FeatureCoverage[] = [
  // ── Projects & environments ───────────────────────────────────────────────
  {
    slug: "static_sites_limit",
    label: "Static websites",
    group: "projects",
    source: "measured",
    note: "AccountPlan.static_projects_in_use — counted from the project rows.",
  },
  {
    slug: "edge_projects_limit",
    label: "Edge function / API projects",
    group: "projects",
    source: "measured",
    note: "AccountPlan.edge_projects_in_use — counted from the project rows.",
  },
  {
    slug: "total_projects_limit",
    label: "Total active projects",
    group: "projects",
    source: "measured",
    note: "AccountPlan.projects_in_use — the create endpoint enforces this one.",
  },
  {
    slug: "environments_per_project",
    label: "Environments per project",
    group: "projects",
    source: "pending",
    note: "Projects have one environment today. Needs the env model (dev/uat/prod) before there is anything to count.",
  },
  {
    slug: "preview_deployments",
    label: "Ephemeral preview deployments",
    group: "projects",
    source: "pending",
    note: "preview_enabled exists on a project, but no per-PR instance is provisioned, so nothing counts concurrent previews.",
  },

  // ── Environment & preview security ────────────────────────────────────────
  {
    slug: "preview_password_protection",
    label: "Preview & env password protection",
    group: "security",
    source: "pending",
    note: "The gateway has no auth barrier for preview hostnames yet — see the deployment-protection work.",
  },
  {
    slug: "env_ip_allowlist",
    label: "Environment IP allowlisting",
    group: "security",
    source: "measured",
    note: "RestrictionsLimits.ip_rules_in_use — the project's ordered address list, counted against the plan's ip_allowlist_rules_limit on write. Still PER PROJECT, not per environment: projects have one environment, so the tier's per-environment wording is ahead of the model.",
  },
  {
    slug: "dashboard_rbac",
    label: "Dashboard access control & RBAC",
    group: "security",
    source: "entitlement",
    note: "A capability, not a meter — the roles a tier may assign.",
  },
  {
    slug: "saml_sso_scim",
    label: "SAML SSO / SCIM",
    group: "security",
    source: "entitlement",
    note: "A capability. The SSO module exists; whether a tier may use it is the plan's answer.",
  },

  // ── Compute & execution ───────────────────────────────────────────────────
  {
    slug: "always_on_instances",
    label: "24/7 always-on instances",
    group: "compute",
    source: "pending",
    note: "Nothing marks a project exempt from idle-sleep, so there is no count of exempt instances.",
  },
  {
    slug: "compute_cpu_hours",
    label: "Included active compute CPU hours",
    group: "compute",
    source: "pending",
    note: "Per-container CPU % is charted from Proxmox RRD, but it is never integrated into hours or summed per account.",
  },
  {
    slug: "provisioned_memory_gb_hours",
    label: "Provisioned memory (GB-hours)",
    group: "compute",
    source: "pending",
    note: "Same shape as CPU hours: the instantaneous series exists, the integral does not.",
  },
  {
    slug: "function_timeout_seconds",
    label: "Max function execution timeout",
    group: "compute",
    source: "entitlement",
    note: "PlanLimits.request_timeout_seconds — a ceiling the gateway enforces, not a meter.",
  },
  {
    slug: "function_concurrency",
    label: "Max function concurrency",
    group: "compute",
    source: "pending",
    note: "The gateway bounds invocation slots per process; nothing aggregates concurrent invocations per account.",
  },
  {
    slug: "warm_pool",
    label: "Cold-start mitigation (warm pool)",
    group: "compute",
    source: "entitlement",
    note: "A capability tier, not a quantity.",
  },

  // ── Edge network & bandwidth ──────────────────────────────────────────────
  {
    slug: "bandwidth_gb",
    label: "Fast data transfer (bandwidth)",
    group: "edge",
    source: "measured",
    note: "ProjectAnalytics.totals.bytes_out per project, from the gateway's traffic accumulator. Account-level roll-up is still pending.",
  },
  {
    slug: "edge_requests",
    label: "Edge requests",
    group: "edge",
    source: "measured",
    note: "ProjectAnalytics.totals.requests per project. Account-level roll-up is still pending.",
  },
  {
    slug: "origin_transfer_gb",
    label: "Fast origin transfer (PoP to origin)",
    group: "edge",
    source: "pending",
    note: "The gateway counts bytes to the CLIENT, not bytes pulled from the origin. Needs a second counter on the upstream leg.",
  },
  {
    slug: "custom_domains",
    label: "Custom domains & auto SSL",
    group: "edge",
    source: "measured",
    note: "The domains module holds the attachments; the count is a list length, not an estimate.",
  },
  {
    slug: "edge_middleware",
    label: "Edge middleware execution",
    group: "edge",
    source: "pending",
    note: "No V8 isolate middleware runs at the edge yet, so there are no executions to count.",
  },
  {
    slug: "india_edge_pops",
    label: "India direct edge PoPs",
    group: "edge",
    source: "entitlement",
    note: "Which PoPs a tier routes through — a fact about the plan.",
  },
  {
    slug: "blob_storage_gb",
    label: "Blob asset storage",
    group: "edge",
    source: "pending",
    note: "Static releases live in the artifact bucket; nothing sums per-account bytes held.",
  },

  // ── Build & deploy ────────────────────────────────────────────────────────
  {
    slug: "build_minutes",
    label: "Build minutes",
    group: "build",
    source: "pending",
    note: "Every build row carries started_at and finished_at, so this is the CLOSEST pending meter — it needs summing per account per month, nothing more.",
    customerNote: "Build minute totals are being calculated for this billing period.",
  },
  {
    slug: "concurrent_builds",
    label: "Concurrent build runners",
    group: "build",
    source: "entitlement",
    note: "A ceiling. builds_in_flight is known, but the limit is what the tier sells.",
  },
  {
    slug: "build_runner_tier",
    label: "Build runner hardware tier",
    group: "build",
    source: "entitlement",
    note: "The runner size a tier gets.",
  },
  {
    slug: "rollback_history",
    label: "Instant rollback history",
    group: "build",
    source: "measured",
    note: "Retained builds are rows in the builds table — countable exactly.",
  },
  {
    slug: "monorepo_support",
    label: "Monorepo & multi-framework",
    group: "build",
    source: "entitlement",
    note: "root_dir is configurable per project; this is a capability flag.",
  },

  // ── Security & governance ─────────────────────────────────────────────────
  {
    slug: "waf_custom_rules",
    label: "Custom WAF & firewall rules",
    group: "governance",
    source: "measured",
    note: "RestrictionsLimits.signatures_in_use — enabled managed signatures on the project's policy, counted against waf_custom_rules_limit on write. These are the platform's own catalog rules turned on per app, not customer-authored rules; a tenant cannot yet write a signature of their own.",
  },
  {
    slug: "rate_limit_rules",
    label: "Rate limiting rules",
    group: "governance",
    source: "measured",
    note: "RestrictionsLimits.rate_limits_in_use — one optional ceiling per project, counted against rate_limiting_rules_limit. An absent limit is the platform default and rps 0 is a real setting that serves nothing; the two must never render alike.",
  },
  {
    slug: "audit_log_retention_days",
    label: "Audit log retention",
    group: "governance",
    source: "entitlement",
    note: "A retention window, not a consumption meter.",
  },

  // ── Observability & support ───────────────────────────────────────────────
  {
    slug: "telemetry_events",
    label: "Telemetry & analytics events",
    group: "observability",
    source: "pending",
    note: "No client-side telemetry SDK ships yet, so no events are ingested to count.",
  },
  {
    slug: "runtime_log_retention_days",
    label: "Runtime logs retention",
    group: "observability",
    source: "pending",
    note: "The gateway writes per-request rows to ClickHouse when REQUESTLOG_CLICKHOUSE_DSN is set. Until then nothing is retained and the Logs view says so.",
    customerNote: "Request-level log history is being enabled for this region.",
  },
  {
    slug: "support_sla",
    label: "Support SLA & channels",
    group: "observability",
    source: "entitlement",
    note: "A contractual term.",
  },
]

/** Coverage for one slug, or undefined when the sheet sells something this table has not been told about. */
export function coverageFor(slug: string): FeatureCoverage | undefined {
  return FEATURE_COVERAGE.find((row) => row.slug === slug)
}

/**
 * How much of what is sold can actually be shown.
 *
 * Rendered on the coverage panel so the gap is a number someone owns, rather
 * than a feeling. `entitlement` rows count as covered because they are complete
 * as they stand — there is no missing measurement behind them.
 */
export function coverageSummary(): { measured: number; entitlement: number; pending: number } {
  const tally = { measured: 0, entitlement: 0, pending: 0 }
  for (const row of FEATURE_COVERAGE) tally[row.source] += 1
  return tally
}
