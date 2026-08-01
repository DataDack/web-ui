// The organization's single resource naming convention.
//
// One regular expression governs what every resource in the organization can be
// named — there is no per-resource policy. The regex is the source of truth
// (stored on the organizations row and enforced by the API), but admins never
// have to write regex: they pick a preset or toggle a friendly builder, and we
// compile that to the pattern here. Keep DEFAULT_PATTERN in sync with the Go
// dto.DefaultPattern.

export const DEFAULT_PATTERN = "^[a-z][a-z0-9-]{1,62}$"

export type LetterCase = "lower" | "upper" | "mixed"

/** The friendly, human-editable model the builder UI manipulates. It compiles
 * deterministically to a regex via {@link builderToPattern}. */
export interface NamingBuilder {
    letterCase: LetterCase
    digits: boolean
    hyphen: boolean
    underscore: boolean
    dot: boolean
    space: boolean
    /** the name must begin with a letter */
    startsWithLetter: boolean
    minLength: number
    maxLength: number
}

export const DEFAULT_BUILDER: NamingBuilder = {
    letterCase: "lower",
    digits: true,
    hyphen: true,
    underscore: false,
    dot: false,
    space: false,
    startsWithLetter: true,
    minLength: 2,
    maxLength: 63,
}

function letterClass(c: LetterCase): string {
    if (c === "lower") return "a-z"
    if (c === "upper") return "A-Z"
    return "a-zA-Z"
}

/** The character class for the body of the name. Hyphen is placed last so it is
 * never read as a range. Mirrors the Go naming builder. */
function bodyClass(b: NamingBuilder): string {
    let s = letterClass(b.letterCase)
    if (b.digits) s += "0-9"
    if (b.underscore) s += "_"
    if (b.dot) s += "\\."
    if (b.space) s += " "
    if (b.hyphen) s += "-"
    return s
}

/** Compile a builder into the canonical regex, length bounds included. */
export function builderToPattern(b: NamingBuilder): string {
    const min = Math.max(1, Math.floor(b.minLength))
    const max = Math.max(min, Math.floor(b.maxLength))
    const body = bodyClass(b)
    if (b.startsWithLetter) {
        // first character is a letter; the remaining min-1..max-1 are body chars
        return `^[${letterClass(b.letterCase)}][${body}]{${String(min - 1)},${String(max - 1)}}$`
    }
    return `^[${body}]{${String(min)},${String(max)}}$`
}

const LETTER_CASES: LetterCase[] = ["lower", "upper", "mixed"]
const FLAG_KEYS = ["digits", "hyphen", "underscore", "dot", "space"] as const

/** Every combination of the five character-class toggles (2^5 = 32). */
const FLAG_COMBOS: Pick<NamingBuilder, (typeof FLAG_KEYS)[number]>[] = Array.from(
    { length: 1 << FLAG_KEYS.length },
    (_, mask) =>
        Object.fromEntries(
            FLAG_KEYS.map((k, i) => [k, Boolean(mask & (1 << i))])
        ) as Pick<NamingBuilder, (typeof FLAG_KEYS)[number]>
)

/** Recover a builder from a pattern, or null when the pattern was not produced
 * by the builder (i.e. a hand-written / advanced regex). The toggle space is
 * tiny, so we enumerate it and keep the candidate that round-trips exactly —
 * this guarantees switching to the builder never silently changes the pattern. */
export function patternToBuilder(pattern: string): NamingBuilder | null {
    const len = /\{(\d+),(\d+)\}\$$/.exec(pattern)
    if (!len) return null
    const a = Number(len[1])
    const b = Number(len[2])
    const candidates: NamingBuilder[] = []
    for (const startsWithLetter of [true, false]) {
        const minLength = startsWithLetter ? a + 1 : a
        const maxLength = startsWithLetter ? b + 1 : b
        for (const letterCase of LETTER_CASES) {
            for (const flags of FLAG_COMBOS) {
                candidates.push({ letterCase, ...flags, startsWithLetter, minLength, maxLength })
            }
        }
    }
    return candidates.find((c) => builderToPattern(c) === pattern) ?? null
}

/** Validate a candidate name against the convention regex. Returns the first
 * violation message or null. An empty pattern means "allow any name" (the
 * default); a pattern that fails to compile is likewise treated as no constraint
 * (fail-open), matching the server. */
export function validatePattern(pattern: string, name: string): string | null {
    if (name.length === 0) return "Name is required"
    if (pattern.trim() === "") return null
    let re: RegExp
    try {
        re = new RegExp(pattern)
    } catch {
        return null
    }
    return re.test(name) ? null : "Doesn't match the naming convention"
}

function caseLabel(c: LetterCase): string {
    if (c === "lower") return "lowercase letters"
    if (c === "upper") return "uppercase letters"
    return "letters"
}

/** A short, human description of what a convention permits — used as form hint. */
export function describeBuilder(b: NamingBuilder): string {
    const parts: string[] = [caseLabel(b.letterCase)]
    if (b.digits) parts.push("numbers")
    if (b.hyphen) parts.push("hyphens")
    if (b.underscore) parts.push("underscores")
    if (b.dot) parts.push("dots")
    if (b.space) parts.push("spaces")
    const start = b.startsWithLetter ? "; must start with a letter" : ""
    return `${String(b.minLength)}–${String(b.maxLength)} characters: ${parts.join(", ")}${start}`
}

/** Human description for any stored pattern (builder-derived when possible). */
export function describePattern(pattern: string): string {
    const b = patternToBuilder(pattern)
    return b ? describeBuilder(b) : `Names must match the pattern ${pattern}`
}

/** A ready-made convention an admin can pick without touching the builder. */
export interface NamingPreset {
    id: string
    label: string
    description: string
    builder: NamingBuilder
    example: string
}

const base = (over: Partial<NamingBuilder>): NamingBuilder => ({ ...DEFAULT_BUILDER, ...over })

export const NAMING_PRESETS: NamingPreset[] = [
    {
        id: "kebab",
        label: "Lowercase with hyphens",
        description: "Lowercase letters, numbers and hyphens — the classic kebab-case.",
        builder: base({ hyphen: true, underscore: false }),
        example: "web-server-01",
    },
    {
        id: "snake",
        label: "Lowercase with underscores",
        description: "Lowercase letters, numbers and underscores — snake_case.",
        builder: base({ hyphen: false, underscore: true }),
        example: "web_server_01",
    },
    {
        id: "lower",
        label: "Lowercase only",
        description: "Lowercase letters and numbers, with no separators.",
        builder: base({ hyphen: false, underscore: false }),
        example: "webserver01",
    },
    {
        id: "mixed",
        label: "Allow capital letters",
        description: "Upper and lowercase letters, numbers and hyphens.",
        builder: base({ letterCase: "mixed", hyphen: true }),
        example: "WebServer-01",
    },
]

/** The preset whose compiled pattern matches the given one, or null for a custom
 * convention. Used to highlight the active preset card. */
export function presetForPattern(pattern: string): NamingPreset | null {
    return NAMING_PRESETS.find((p) => builderToPattern(p.builder) === pattern) ?? null
}
