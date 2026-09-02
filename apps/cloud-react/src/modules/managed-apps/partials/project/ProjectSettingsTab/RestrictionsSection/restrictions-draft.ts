import type {
  IpRule,
  IpRuleAction,
  RestrictionsDocument,
  SignatureSetting,
  UpdateRestrictionsRequest,
  WafCatalogRule,
  WafMode,
} from "../../../../managed-apps.types"

/**
 * One address rule as the editor holds it.
 *
 * `id` is a client-only handle. The list is ORDERED and reorderable — the edge
 * takes the first match, so a deny of a range with an allow of one address
 * inside it only works one way round — and using the CIDR as a React key would
 * remount a row on every keystroke and lose focus mid-address.
 */
export interface IpRuleDraft extends IpRule {
  id: string
}

/** A blank rule. Deny is the default action because that is what somebody
 *  opening this page has come to do; an allow list is built by adding allows
 *  above a deny-all, which is a second deliberate step. */
export function newIpRule(): IpRuleDraft {
  return { id: crypto.randomUUID(), cidr: "", action: "deny", mode: "log", note: "" }
}

/** The whole editable document, with the two lists in the shapes the editor
 *  needs (ordered rules with handles, settings keyed by rule id). */
export interface RestrictionsDraft {
  ipRules: IpRuleDraft[]
  signatures: Record<string, SignatureSetting>
  defaultMode: WafMode
  /** Empty string means "use the platform default", which is a different
   *  answer from 0 and must survive a round trip through an input. */
  blockThreshold: string
  rateLimitEnabled: boolean
  rps: string
  burst: string
}

/** Seeds the editor from what the server says is stored. */
export function toDraft(doc: RestrictionsDocument): RestrictionsDraft {
  return {
    ipRules: doc.ip_rules.map((rule) => ({
      id: crypto.randomUUID(),
      cidr: rule.cidr,
      action: rule.action,
      mode: rule.mode ?? "log",
      note: rule.note ?? "",
    })),
    signatures: { ...doc.signatures },
    defaultMode: doc.default_mode ?? "log",
    blockThreshold: doc.block_threshold ? String(doc.block_threshold) : "",
    rateLimitEnabled: Boolean(doc.rate_limit),
    rps: doc.rate_limit ? String(doc.rate_limit.rps) : "",
    burst: doc.rate_limit?.burst ? String(doc.rate_limit.burst) : "",
  }
}

/**
 * The payload to send.
 *
 * Blank rows are dropped rather than rejected: a user who clicked Add and then
 * changed their mind has left an empty row, and refusing the whole save over it
 * would make them hunt for which row is empty. A row with a note and no address
 * is dropped too — there is nothing to enforce.
 */
export function toRequest(draft: RestrictionsDraft): UpdateRestrictionsRequest {
  const ipRules: IpRule[] = draft.ipRules
    .filter((rule) => rule.cidr.trim() !== "")
    .map((rule) => ({
      cidr: rule.cidr.trim(),
      action: rule.action,
      // An allow rule's mode is never read at the edge — "would have allowed"
      // is indistinguishable from what already happens — so it is not sent.
      ...(rule.action === "deny" && rule.mode === "block" ? { mode: "block" } : {}),
      ...(rule.note?.trim() ? { note: rule.note.trim() } : {}),
    }))

  const signatures: Record<string, SignatureSetting> = {}
  for (const [id, setting] of Object.entries(draft.signatures)) {
    if (!setting.enabled) continue
    signatures[id] = {
      enabled: true,
      ...(setting.mode && setting.mode !== "log" ? { mode: setting.mode } : {}),
      ...(setting.score ? { score: setting.score } : {}),
    }
  }

  const threshold = Number.parseInt(draft.blockThreshold, 10)
  return {
    ip_rules: ipRules,
    signatures,
    default_mode: draft.defaultMode,
    block_threshold: Number.isFinite(threshold) && threshold > 0 ? threshold : 0,
    rate_limit: draft.rateLimitEnabled
      ? { rps: toCount(draft.rps), burst: toCount(draft.burst) }
      : null,
  }
}

/** A non-negative integer from a text field. A blank or unparseable box is 0,
 *  which for the rate limit means "serve nothing" — deliberate, and the reason
 *  the section warns about it rather than silently sending a default. */
function toCount(value: string): number {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

/** Whether the draft differs from what is stored. Compared as the PAYLOAD
 *  rather than field by field, so a change that makes no difference on the wire
 *  — retyping the same address, toggling a rule off and on — leaves Save
 *  disabled instead of offering a no-op write of an access-control list. */
export function isDirty(draft: RestrictionsDraft, stored: RestrictionsDocument): boolean {
  return JSON.stringify(toRequest(draft)) !== JSON.stringify(toRequest(toDraft(stored)))
}

/**
 * One rule's setting, or undefined when nobody has touched it.
 *
 * A function rather than an index read because an index read of a Record is
 * typed as always present, which is a lie for a map keyed by every rule in a
 * catalog the project has mostly not configured — and a lie the compiler then
 * enforces, by rejecting the `?.` that keeps the caller safe.
 */
export function settingFor(
  settings: Record<string, SignatureSetting>,
  id: string,
): SignatureSetting | undefined {
  return Object.hasOwn(settings, id) ? settings[id] : undefined
}

/** Enabled signature rules — what the plan's rule quota is measured against. */
export function enabledCount(signatures: Record<string, SignatureSetting>): number {
  return Object.values(signatures).filter((setting) => setting.enabled).length
}

/** Address rules that would actually be stored (a blank row is not a rule). */
export function ipRuleCount(rules: readonly IpRuleDraft[]): number {
  return rules.filter((rule) => rule.cidr.trim() !== "").length
}

/**
 * Whether text is something the backend will accept as a prefix.
 *
 * Mirrors the server's parser rather than guessing at it: a bare address is a
 * full-length prefix, and anything with a slash must be a real CIDR. The check
 * is here so a bad address is caught beside the box rather than as a sentence
 * about "rule 3" after a save.
 *
 * Deliberately NOT a mask check. 203.0.113.5/24 is accepted here and stored as
 * 203.0.113.0/24 — the server masks it, and the editor re-seeds from the
 * response, which is how the user sees what was actually kept.
 */
export function isValidCidr(text: string): boolean {
  const value = text.trim()
  if (value === "") return false
  const parts = value.split("/")
  if (parts.length > 2) return false
  const [address, prefix] = parts as [string, string | undefined]
  const isV6 = address.includes(":")
  if (parts.length === 2) {
    const bits = prefix ?? ""
    if (!/^\d{1,3}$/.test(bits)) return false
    if (Number(bits) > (isV6 ? 128 : 32)) return false
  }
  return isV6 ? isIPv6(address) : isIPv4(address)
}

function isIPv4(address: string): boolean {
  const parts = address.split(".")
  if (parts.length !== 4) return false
  return parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

/** Deliberately permissive: it accepts the compressed forms people actually
 *  paste and leaves the last word to the server, rather than reimplementing
 *  RFC 4291 in a form field and rejecting an address that is in fact valid. */
function isIPv6(address: string): boolean {
  if (!/^[0-9a-fA-F:]+$/.test(address)) return false
  return address.includes(":") && !address.includes(":::")
}

/** The categories the catalog uses, in the order this page shows them:
 *  unambiguous reconnaissance first, then payload signatures, then the bot
 *  heuristics that need the most tuning. */
export const CATEGORY_ORDER = [
  "recon",
  "scanner",
  "protocol",
  "traversal",
  "injection",
  "sqli",
  "xss",
  "bot",
] as const

export const CATEGORY_LABELS: Record<string, string> = {
  recon: "Reconnaissance",
  scanner: "Scanners",
  protocol: "Protocol abuse",
  traversal: "Path traversal",
  injection: "Injection",
  sqli: "SQL injection",
  xss: "Cross-site scripting",
  bot: "Bots & automation",
  ip: "Address rules",
}

/** What a rule's built-in weight means, in the words the ruleset uses. The
 *  number alone tells a reader nothing about whether a rule acts alone. */
export const SCORE_LABELS: Record<number, string> = {
  2: "Notice",
  3: "Warning",
  4: "Error",
  5: "Critical",
}

/** Catalog rules grouped for display, in CATEGORY_ORDER, with anything the
 *  platform adds later appended rather than dropped. */
export function groupByCategory(
  catalog: readonly WafCatalogRule[],
): { category: string; label: string; rules: WafCatalogRule[] }[] {
  const groups = new Map<string, WafCatalogRule[]>()
  for (const rule of catalog) {
    const existing = groups.get(rule.category)
    if (existing) existing.push(rule)
    else groups.set(rule.category, [rule])
  }
  const ordered: string[] = CATEGORY_ORDER.filter((key) => groups.has(key))
  // A category the platform adds later is appended rather than dropped: the
  // catalog is generated from the gateway's ruleset and may name one this
  // build's order has never heard of, and a rule that is offered nowhere is a
  // rule nobody can turn on.
  for (const key of groups.keys()) {
    if (!ordered.includes(key)) ordered.push(key)
  }
  return ordered.map((category) => ({
    category,
    label: CATEGORY_LABELS[category] ?? category,
    rules: groups.get(category) ?? [],
  }))
}

/** "5 of 20 used", or "5 used" when the tier sells no ceiling. -1 is unlimited
 *  and 0 is a genuine none, so the two can never render the same way. */
export function quotaLabel(used: number, max: number): string {
  if (max < 0) return `${String(used)} in use · unlimited`
  return `${String(used)} of ${String(max)} used`
}

/** Whether one more of a thing may be added under this ceiling. */
export function canAdd(used: number, max: number): boolean {
  return max < 0 || used < max
}

export const ACTION_LABELS: Record<IpRuleAction, string> = {
  allow: "Allow",
  deny: "Deny",
}

export const MODE_LABELS: Record<WafMode, string> = {
  log: "Log only",
  block: "Block",
}
