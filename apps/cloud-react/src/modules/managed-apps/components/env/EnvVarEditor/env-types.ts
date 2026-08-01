/**
 * One row in the environment editor.
 *
 * `id` is a client-only handle so React keys survive reordering and removal —
 * the key field cannot serve that purpose because it is edited character by
 * character and starts empty.
 */
export interface EnvRow {
    id: string
    key: string
    value: string
    state: EnvRowState
}

/**
 * Where a row's value stands.
 *
 * `stored` is the one that matters: the backend returns variable NAMES only
 * (values are sealed at rest and never leave it), so for an existing variable
 * the console genuinely does not know the value. It must not render an empty
 * box that looks like an empty value — that is how a save silently blanks a
 * secret.
 */
export type EnvRowState = "new" | "stored" | "edited"

/** Fresh row for the editor's "Add variable" control. */
export function newEnvRow(key = "", value = ""): EnvRow {
    return { id: crypto.randomUUID(), key, value, state: "new" }
}

/** Rows for variables that already exist server-side, values unknown. */
export function storedEnvRows(names: readonly string[]): EnvRow[] {
    return names.map((key) => ({ id: crypto.randomUUID(), key, value: "", state: "stored" }))
}

/** Keys appearing on more than one row, ignoring blanks. Case-sensitive. */
export function duplicateKeys(rows: readonly EnvRow[]): Set<string> {
    const seen = new Set<string>()
    const duplicates = new Set<string>()
    for (const row of rows) {
        const key = row.key.trim()
        if (key === "") continue
        if (seen.has(key)) duplicates.add(key)
        seen.add(key)
    }
    return duplicates
}

/** The map to send. Blank keys are dropped; later rows win a key collision. */
export function toEnvMap(rows: readonly EnvRow[]): Record<string, string> {
    const out: Record<string, string> = {}
    for (const row of rows) {
        const key = row.key.trim()
        if (key !== "") out[key] = row.value
    }
    return out
}
