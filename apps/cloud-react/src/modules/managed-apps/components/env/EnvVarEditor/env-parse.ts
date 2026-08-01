// Parsing a pasted `.env` file.
//
// Pure and dependency-free so it can be unit-tested without React. The rules
// follow what people actually have in a .env, not a strict grammar: a stray
// `export`, quoted values with spaces, `#` comments, and blank lines all have
// to survive a paste, and anything that does not parse must be REPORTED rather
// than silently dropped — a quietly discarded line is a missing secret at
// runtime.

export interface ParsedEnvLine {
    key: string
    value: string
}

export interface ParsedEnv {
    entries: ParsedEnvLine[]
    /** 1-based line numbers that carried content but could not be parsed. */
    skipped: number[]
    /** Keys that appeared more than once; the last occurrence wins. */
    duplicates: string[]
}

/** A shell-ish env name: letters, digits, underscore, not leading with a digit. */
const KEY_PATTERN = /^[A-Za-z_]\w*$/

/**
 * Strips one matching pair of surrounding quotes. Inside double quotes the
 * common escapes are honoured, because a pasted `\n` in a private key is meant
 * as a newline; inside single quotes nothing is interpreted, per shell rules.
 */
function unquote(raw: string): string {
    if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
        return raw
            .slice(1, -1)
            .replace(/\\n/g, "\n")
            .replace(/\\r/g, "\r")
            .replace(/\\t/g, "\t")
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, "\\")
    }
    if (raw.length >= 2 && raw.startsWith("'") && raw.endsWith("'")) {
        return raw.slice(1, -1)
    }
    return raw
}

/**
 * Removes a trailing `# comment` from an unquoted value. Only when the `#` is
 * preceded by whitespace — `pass#word` is a password, not a comment.
 */
function stripTrailingComment(raw: string): string {
    // Scanned rather than matched with /\s+#/: that pattern backtracks on long
    // runs of whitespace, and this string is arbitrary pasted input.
    for (let i = 1; i < raw.length; i += 1) {
        if (raw[i] === "#" && /\s/.test(raw[i - 1] ?? "")) return raw.slice(0, i)
    }
    return raw
}

/** Parses a pasted `.env` document. Never throws. */
export function parseDotEnv(text: string): ParsedEnv {
    const entries: ParsedEnvLine[] = []
    const skipped: number[] = []
    const seen = new Set<string>()
    const duplicates = new Set<string>()

    text.split(/\r?\n/).forEach((rawLine, index) => {
        const line = rawLine.trim()
        // Blank lines and whole-line comments are not content — not skips.
        if (line === "" || line.startsWith("#")) return

        const withoutExport = line.startsWith("export ")
            ? line.slice("export ".length).trim()
            : line
        const eq = withoutExport.indexOf("=")
        if (eq <= 0) {
            skipped.push(index + 1)
            return
        }

        const key = withoutExport.slice(0, eq).trim()
        if (!KEY_PATTERN.test(key)) {
            skipped.push(index + 1)
            return
        }

        const rawValue = withoutExport.slice(eq + 1).trim()
        const quoted =
            (rawValue.startsWith('"') && rawValue.endsWith('"') && rawValue.length >= 2) ||
            (rawValue.startsWith("'") && rawValue.endsWith("'") && rawValue.length >= 2)
        const value = quoted ? unquote(rawValue) : stripTrailingComment(rawValue).trim()

        if (seen.has(key)) duplicates.add(key)
        seen.add(key)
        entries.push({ key, value })
    })

    // Last occurrence wins, matching how a shell would source the file.
    const collapsed = new Map<string, string>()
    for (const entry of entries) collapsed.set(entry.key, entry.value)

    return {
        entries: [...collapsed].map(([key, value]) => ({ key, value })),
        skipped,
        duplicates: [...duplicates],
    }
}
