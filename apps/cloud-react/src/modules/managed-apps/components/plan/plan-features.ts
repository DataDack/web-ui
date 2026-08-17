import { formatQuota, quotaField } from "./plan-format"
import type { Plan, PlanLimits, PlanRuntimes } from "../../managed-apps.types"

/**
 * Everything Managed Apps sells, named once.
 *
 * The catalogue in S3 carries eight numbers and two runtime flags — enough to
 * price a tier, nowhere near enough to answer "what do I get for ₹499?". The
 * capabilities that answer that question (auto-deploy on push, streaming build
 * logs, a source browser) are not per-tier data and never will be: nothing in
 * the backend gates them by plan. So they live here, as frontend copy, and are
 * stated as included on every tier because that is the truth.
 *
 * The rule this file exists to enforce: a row may only claim something the
 * platform actually does. Every capability below was read out of the module —
 * the GitHub push and pull_request webhooks, the build log stream, the domains
 * tab — and rollback, analytics, log drains, seats and SSO are absent because
 * they are not built. A pricing page that oversells is worse than a short one.
 */

/** What one tier answers for one row, after resolution. */
export type FeatureCell =
  { kind: "included" } | { kind: "absent" } | { kind: "text"; value: string }

/**
 * Where a row's value comes from.
 *
 * `quota` and `runtime` read the catalogue, so they change when pricing changes
 * in S3 without a deploy. `everyPlan` is a capability with no tier dimension —
 * declaring it as data rather than as a checkmark hardcoded in the table keeps
 * the "is this actually true per tier?" question answerable in one place.
 */
type FeatureSource =
  | { from: "quota"; key: keyof PlanLimits }
  | { from: "runtime"; key: keyof PlanRuntimes }
  | { from: "everyPlan" }
  | { from: "customOnly" }

export interface FeatureRow {
  label: string
  /** One sentence of "what is this", shown under the label. */
  hint?: string
  source: FeatureSource
  /**
   * What the Custom tier answers, when it differs from the default derivation.
   * Custom is not in the catalogue — it is a conversation — so its column is
   * declared, not computed.
   */
  custom?: FeatureCell
}

export interface FeatureGroup {
  title: string
  rows: FeatureRow[]
}

/** A quota row, taking its label and unit suffix from QUOTA_FIELDS. */
function quota(key: keyof PlanLimits, hint?: string, custom?: FeatureCell): FeatureRow {
  return {
    // The label is the catalogue's, not a second name for the same number:
    // the cards and this table must not disagree about what a quota is called.
    label: quotaField(key)?.label ?? key,
    hint,
    source: { from: "quota", key },
    custom: custom ?? { kind: "text", value: "Negotiated" },
  }
}

/** A capability every tier has. */
function everyPlan(label: string, hint?: string): FeatureRow {
  return { label, hint, source: { from: "everyPlan" } }
}

/**
 * The full listing, grouped the way a reader shops: what you can run, how it
 * gets built, how it is served, how you operate it, what it costs.
 *
 * Each of the eight quotas appears exactly once, in the group it belongs to,
 * rather than in one "limits" block — a number means more beside the capability
 * it constrains than beside seven other numbers.
 */
export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    title: "Projects",
    rows: [
      quota(
        "max_projects",
        "Active projects in the account. The only quota the platform enforces on create.",
        { kind: "text", value: "As many as you need" },
      ),
      // No "Estate overview" row: that tab spans cPanel Hosting as well as
      // Managed Apps, so it is not something a Managed Apps tier buys you —
      // you get it for being in the console at all.
      everyPlan("Rename and delete projects"),
    ],
  },
  {
    title: "Build & deploy",
    rows: [
      everyPlan(
        "GitHub App connection",
        "Connect an organisation or personal account and pick a repository.",
      ),
      everyPlan("Automatic deploy on push", "A push to the tracked branch starts a build."),
      // NOT "pull-request builds". The pull_request webhook this platform
      // listens to is the setup flow's — it opens a PR adding the build
      // workflow to the repository and watches whether you merge it. Nothing
      // builds a PR branch, and saying so on a pricing page would be a lie.
      everyPlan(
        "Setup by pull request",
        "The build workflow is proposed as a PR against your repository, for you to review and merge.",
      ),
      everyPlan(
        "Framework auto-detection",
        "The repository is inspected and the build settings proposed.",
      ),
      everyPlan("Configurable build command and output directory"),
      quota("build_minutes", "Build time included each month."),
      quota("max_deployment_mb", "The largest build output that can be released."),
      everyPlan("Live build logs", "Streamed while the build runs, and kept afterwards."),
      everyPlan("Cancel a running build"),
      everyPlan("Manual redeploy", "Rebuild the current commit without pushing anything."),
      everyPlan("Build history", "Every build for a project, with its commit and result."),
      everyPlan("Source browser", "Read the repository as it stood at the build's commit."),
    ],
  },
  {
    title: "Runtimes",
    rows: [
      {
        label: "React (single-page app)",
        hint: "A static build served from the edge.",
        source: { from: "runtime", key: "react" },
      },
      {
        label: "Next.js (OpenNext)",
        hint: "Server-rendered and hybrid Next.js applications.",
        source: { from: "runtime", key: "opennext" },
      },
      everyPlan("Node version selection"),
      everyPlan("Environment variables", "Set per project and applied at build and at runtime."),
    ],
  },
  {
    title: "Network & domains",
    rows: [
      everyPlan(
        "Project subdomain",
        "Every project gets a public address the moment it is created.",
      ),
      everyPlan("Automatic HTTPS", "Certificates are issued and renewed by the platform."),
      quota("max_custom_domains", "Domains of your own you can point at a project."),
      everyPlan("Edge routing", "Requests are resolved and routed by the platform gateway."),
      quota("bandwidth_gb", "Data served to visitors each month."),
      quota("edge_requests", "Requests answered at the edge each month."),
      quota("max_upload_mb", "The largest request body a project will accept."),
      quota("request_timeout_seconds", "How long a single request may take before it is cut off."),
    ],
  },
  {
    title: "Billing & support",
    rows: [
      everyPlan(
        "Billed monthly from the wallet",
        "Upgrades take effect immediately and are charged on change.",
      ),
      everyPlan("Support tickets", "Raised from the console; answered in the thread."),
      {
        label: "Direct line",
        hint: "A named contact rather than the ticket queue.",
        source: { from: "customOnly" },
      },
    ],
  },
]

/**
 * What one catalogue tier answers for one row.
 *
 * A quota of 0 resolves to the word "None" rather than to an absent cell: 0 and
 * "not available" look alike in a table but are different promises, and Starter
 * selling zero custom domains is exactly the case where a bare dash would read
 * as "this tier does not have domains at all".
 */
export function featureCell(row: FeatureRow, plan: Plan): FeatureCell {
  switch (row.source.from) {
    case "quota":
      return { kind: "text", value: formatQuota(row.source.key, plan.limits) }
    case "runtime":
      return plan.runtimes[row.source.key] ? { kind: "included" } : { kind: "absent" }
    case "customOnly":
      return { kind: "absent" }
    default:
      return { kind: "included" }
  }
}

/** What the Custom tier answers. Declared, because Custom has no catalogue row. */
export function customFeatureCell(row: FeatureRow): FeatureCell {
  if (row.custom) return row.custom
  return { kind: "included" }
}

const CUSTOM_CARD_ROWS: (keyof PlanLimits)[] = ["max_projects", "bandwidth_gb", "build_minutes"]

/**
 * The four slots the Custom card fills, in the same order the priced cards use.
 *
 * Read out of the groups above rather than listed again on the card, so the card
 * and the comparison table cannot end up promising different things. The fourth
 * slot is support rather than a fourth quota: it is the reason to have this
 * conversation, and repeating "Negotiated" a third time says nothing.
 */
export function customHighlights(): { label: string; value: string }[] {
  const rows = FEATURE_GROUPS.flatMap((group) => group.rows)
  const cellText = (row: FeatureRow | undefined): string => {
    const cell = row ? customFeatureCell(row) : undefined
    return cell?.kind === "text" ? cell.value : "Negotiated"
  }

  const quotas = CUSTOM_CARD_ROWS.map((key) => {
    const row = rows.find((entry) => entry.source.from === "quota" && entry.source.key === key)
    return { label: quotaField(key)?.label ?? key, value: cellText(row) }
  })

  return [...quotas, { label: "Support", value: "Direct line" }]
}
