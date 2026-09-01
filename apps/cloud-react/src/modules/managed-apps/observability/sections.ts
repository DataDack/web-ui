import {
  Activity,
  AlertTriangle,
  ArrowDownUp,
  Boxes,
  Clock,
  Cpu,
  Database,
  FileCode2,
  Globe,
  Hammer,
  Image,
  Layers,
  Network,
  ScrollText,
  ShieldCheck,
  Timer,
  type LucideIcon,
} from "lucide-react"

import type { CoverageSource } from "./feature-coverage"

/**
 * The Observability section's own information architecture.
 *
 * One list, not a tab strip, because the thing being described has natural
 * groups and about fifteen members: Traffic, Compute, Security and Delivery are
 * where a question lands before the reader knows which page answers it. A flat
 * strip of fifteen tabs is a menu you read twice.
 *
 * Every entry declares where its numbers come from. That is what stops this
 * from becoming a list of empty pages: a section with no source renders the
 * calculating state and says what it will show, rather than an axis with
 * nothing on it. As each meter lands, its `source` flips and the page fills in.
 */
export interface ObservabilitySection {
  key: string
  label: string
  group: SectionGroup
  icon: LucideIcon
  /** One line, customer-facing. Never names an internal service. */
  summary: string
  source: CoverageSource
  /** INTERNAL — where the data comes from, or what has to exist first. */
  origin: string
}

export type SectionGroup = "traffic" | "compute" | "delivery" | "security" | "deploys"

export const SECTION_GROUP_LABELS: Record<SectionGroup, string> = {
  traffic: "Traffic",
  compute: "Compute",
  delivery: "Delivery",
  security: "Security",
  deploys: "Deploys",
}

export const OBSERVABILITY_SECTIONS: ObservabilitySection[] = [
  // ── Traffic ───────────────────────────────────────────────────────────────
  {
    key: "overview",
    label: "Overview",
    group: "traffic",
    icon: Layers,
    summary: "Requests, bandwidth and errors at a glance.",
    source: "measured",
    origin: "traffic accumulator: requests, bytes_out, status classes, static share.",
  },
  {
    key: "edge-requests",
    label: "Edge requests",
    group: "traffic",
    icon: Globe,
    summary: "Every request the edge served, by route and status.",
    source: "measured",
    origin: "traffic accumulator for totals; per-route breakdown needs the ClickHouse request log.",
  },
  {
    key: "data-transfer",
    label: "Data transfer",
    group: "traffic",
    icon: ArrowDownUp,
    summary: "Bytes sent to visitors, against the plan's monthly allowance.",
    source: "measured",
    origin:
      "traffic accumulator bytes_out. Origin-pull bytes are NOT counted — the gateway counts bytes to the client only.",
  },
  {
    key: "logs",
    label: "Runtime logs",
    group: "traffic",
    icon: ScrollText,
    summary: "Individual requests with status, cache decision and latency.",
    source: "pending",
    origin:
      "ClickHouse request log. Write and read paths are built; needs REQUESTLOG_CLICKHOUSE_DSN.",
  },

  // ── Compute ───────────────────────────────────────────────────────────────
  {
    key: "resources",
    label: "Resources",
    group: "compute",
    icon: Cpu,
    summary: "CPU, memory, disk and network for this app's container.",
    source: "measured",
    origin: "Proxmox per-guest RRD, via /projects/:id/metrics.",
  },
  {
    key: "functions",
    label: "Functions",
    group: "compute",
    icon: FileCode2,
    summary: "Invocations, duration and cold starts per route.",
    source: "pending",
    origin:
      "The faas control plane records invocations, but nothing aggregates them per managed-app project or per route.",
  },
  {
    key: "cron",
    label: "Cron jobs",
    group: "compute",
    icon: Clock,
    summary: "Scheduled runs and how long each took.",
    source: "pending",
    origin: "No scheduler exists for managed apps yet — there are no runs to report.",
  },
  {
    key: "external-apis",
    label: "External APIs",
    group: "compute",
    icon: Network,
    summary: "Outbound calls an app makes, and what they cost it.",
    source: "pending",
    origin:
      "The gateway sees inbound requests only. Outbound tracking needs instrumentation inside the runtime.",
  },

  // ── Delivery ──────────────────────────────────────────────────────────────
  {
    key: "caching",
    label: "CDN caching",
    group: "delivery",
    icon: Database,
    summary: "Hit rate, misses and what the edge answered without the app.",
    source: "measured",
    origin:
      "httpcache.Stats() plus X-Cache and the per-request cache field; static share is already in analytics totals.",
  },
  {
    key: "isr",
    label: "ISR",
    group: "delivery",
    icon: Boxes,
    summary: "Revalidations and how often a page was regenerated.",
    source: "pending",
    origin:
      "OpenNext sets x-nextjs-cache and the edge passes it through untouched; nothing records it.",
  },
  {
    key: "images",
    label: "Image optimization",
    group: "delivery",
    icon: Image,
    summary: "Images transformed and served at the edge.",
    source: "pending",
    origin: "The edge does not transform images; it serves whatever the build produced.",
  },
  {
    key: "regions",
    label: "Regions",
    group: "delivery",
    icon: Globe,
    summary: "Which edge region served the traffic.",
    source: "pending",
    origin:
      "The request log carries a region column and the gateway stamps it; needs the log connected before there is anything to group by.",
  },

  // ── Security ──────────────────────────────────────────────────────────────
  {
    key: "firewall",
    label: "Firewall",
    group: "security",
    icon: ShieldCheck,
    summary: "Requests allowed, logged and blocked at the edge.",
    source: "measured",
    origin:
      "gateway metrics FilterDecisions and FilterWouldBlock; per-request verdicts are in the request log's filter fields.",
  },
  {
    key: "rate-limits",
    label: "Rate limits",
    group: "security",
    icon: Timer,
    summary: "Requests throttled against this app's configured ceiling.",
    source: "measured",
    origin:
      "edgelimit.Stats() — allowed, refused, evicted. Now fleet-wide when GATEWAY_REDIS_URL is set.",
  },
  {
    key: "rules",
    label: "Rules",
    group: "security",
    icon: AlertTriangle,
    summary: "Custom firewall and rate-limit rules for this project.",
    source: "pending",
    origin:
      "The edge evaluates a core ruleset, but the console owns no per-account rule set to manage or count against the plan limit.",
  },

  // ── Deploys ───────────────────────────────────────────────────────────────
  {
    key: "build-diagnostics",
    label: "Build diagnostics",
    group: "deploys",
    icon: Hammer,
    summary: "How long builds take and where the time goes.",
    source: "measured",
    origin: "The builds table: started_at, finished_at and status per build.",
  },
  {
    key: "activity",
    label: "Activity",
    group: "deploys",
    icon: Activity,
    summary: "Lifecycle events grouped per deployment.",
    source: "measured",
    origin: "ActivityTimeline, from the same build rows.",
  },
]

/** Every section key — for validating a `?section=` the user may have typed. */
export const SECTION_KEYS = OBSERVABILITY_SECTIONS.map((section) => section.key)

/** Sections in one group, in declaration order. */
export function sectionsIn(group: SectionGroup): ObservabilitySection[] {
  return OBSERVABILITY_SECTIONS.filter((section) => section.group === group)
}

export function sectionByKey(key: string): ObservabilitySection | undefined {
  return OBSERVABILITY_SECTIONS.find((section) => section.key === key)
}

/**
 * How much of the section map is live. Rendered on the overview so the gap is a
 * number someone owns rather than a feeling.
 */
export function sectionCoverage(): { measured: number; pending: number } {
  const tally = { measured: 0, pending: 0 }
  for (const section of OBSERVABILITY_SECTIONS) {
    if (section.source === "measured") tally.measured += 1
    else tally.pending += 1
  }
  return tally
}
