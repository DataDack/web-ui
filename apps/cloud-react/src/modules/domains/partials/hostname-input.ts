// Parsing for the add-domain field, which accepts one hostname per line.

// Client-side sanity check only — the server owns real validation (platform
// zones, ownership, quota). Lowercase labels of letters/digits/hyphens, at
// least one dot, so "app.example.com" and the apex "example.com" both pass
// while obvious typos fail before a round trip.
const HOSTNAME_LABEL = "[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?"
const HOSTNAME_RE = new RegExp(`^(?=.{4,253}$)(${HOSTNAME_LABEL}\\.)+${HOSTNAME_LABEL}$`)

export function isValidHostname(value: string): boolean {
  return HOSTNAME_RE.test(value)
}

/**
 * One hostname as typed, normalised to what would be sent.
 *
 * Tolerant on the way in, because the realistic paste is a column copied out of
 * a registrar or a spreadsheet: a scheme, a trailing path, a trailing dot, a
 * comma, stray case and whitespace are all things a person legitimately has in
 * their clipboard, and refusing the whole batch over them would send them back
 * to a text editor to clean it up by hand.
 */
export function normalizeHostname(raw: string): string {
  let value = raw.trim().toLowerCase()
  // A pasted URL: keep the host, drop the scheme, the path, and any credentials
  // or port that came with it.
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
  value = value.replace(/^[^@/]*@/, "")
  value = value.split("/")[0] ?? ""
  value = value.split(":")[0] ?? ""
  // Trailing separators from a list: "example.com," or the fully-qualified dot.
  //
  // A loop rather than /[,.;]+$/, because an anchored quantifier over a run of
  // the very characters it matches is the shape that backtracks quadratically —
  // and this runs over pasted, untrusted text.
  while (value.endsWith(",") || value.endsWith(";") || value.endsWith(".")) {
    value = value.slice(0, -1)
  }
  return value
}

export interface ParsedHostnames {
  /** Valid, normalised, de-duplicated, in the order they were typed. */
  valid: string[]
  /** Normalised entries that failed the check, in the order they were typed. */
  invalid: string[]
}

/**
 * Split the field into hostnames.
 *
 * Newlines are the documented separator; commas and spaces are accepted too
 * because a list copied out of a sentence uses them and the alternative is an
 * error message about punctuation.
 *
 * De-duplicated on the way out: a paste with the same name twice is a slip, and
 * submitting it twice would show the tenant an "already claimed" failure for a
 * domain that had just succeeded a line above.
 */
export function parseHostnames(input: string): ParsedHostnames {
  const seen = new Set<string>()
  const valid: string[] = []
  const invalid: string[] = []
  for (const piece of input.split(/[\s,;]+/)) {
    const value = normalizeHostname(piece)
    if (value === "" || seen.has(value)) continue
    seen.add(value)
    if (isValidHostname(value)) valid.push(value)
    else invalid.push(value)
  }
  return { valid, invalid }
}

// --- internal names ---

// One label under a platform zone. Deliberately stricter than the hostname
// check above and deliberately looser than the server's: length and shape are
// worth catching before a round trip, while the reserved list is not — it is
// the platform's to change, and a copy here would start refusing names the
// server had since released.
const LABEL_RE = new RegExp(`^${HOSTNAME_LABEL}$`)

/** Shortest address a tenant may take. Mirrors entity.MinTenantLabelLen. */
const MIN_LABEL_LEN = 3

/**
 * One internal name as typed, reduced to the label that will be sent.
 *
 * The zone comes off if it was pasted with it — people copy the whole thing out
 * of the address bar — but only its own zone: a name under some other domain is
 * left as it is, so it fails the check below and is named as invalid rather
 * than being silently turned into a label of the platform's zone.
 */
export function normalizeLabel(raw: string, zone: string): string {
  const value = normalizeHostname(raw)
  const suffix = `.${zone.toLowerCase()}`
  return zone !== "" && value.endsWith(suffix) ? value.slice(0, -suffix.length) : value
}

export function isValidLabel(value: string): boolean {
  return value.length >= MIN_LABEL_LEN && LABEL_RE.test(value)
}

/**
 * Split the internal-name field into labels, same separators and same
 * de-duplication as parseHostnames — the field accepts several names for the
 * same reason: the realistic add is `checkout` and `pay`, not one name.
 */
export function parseLabels(input: string, zone: string): ParsedHostnames {
  const seen = new Set<string>()
  const valid: string[] = []
  const invalid: string[] = []
  for (const piece of input.split(/[\s,;]+/)) {
    const value = normalizeLabel(piece, zone)
    if (value === "" || seen.has(value)) continue
    seen.add(value)
    if (isValidLabel(value)) valid.push(value)
    else invalid.push(value)
  }
  return { valid, invalid }
}
