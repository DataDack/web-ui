import { ENV_TARGETS } from "../../../managed-apps.constants"
import type { EnvTarget, EnvVarInput, ProjectEnvVar } from "../../../managed-apps.types"

/**
 * One row in the environment editor.
 *
 * `id` is a client-only handle so React keys survive reordering and removal —
 * the key field cannot serve that purpose because it is edited character by
 * character and starts empty.
 *
 * `targets` is where the variable applies. It is never empty: a variable scoped
 * to nothing is not a state a user can mean, and the backend would read an
 * empty list as "everywhere", so the editor refuses to unset the last one.
 */
export interface EnvRow {
  id: string
  key: string
  value: string
  targets: EnvTarget[]
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

/** Every deployment — what a variable applies to until it is narrowed. */
export function allEnvTargets(): EnvTarget[] {
  return [...ENV_TARGETS]
}

/** Fresh row for the editor's "Add variable" control. */
export function newEnvRow(key = "", value = "", targets: EnvTarget[] = allEnvTargets()): EnvRow {
  return { id: crypto.randomUUID(), key, value, targets, state: "new" }
}

/** Rows for variables that already exist server-side, values unknown. */
export function storedEnvRows(vars: readonly ProjectEnvVar[]): EnvRow[] {
  return vars.map((item) => ({
    id: crypto.randomUUID(),
    key: item.key,
    value: "",
    targets: item.targets.length > 0 ? [...item.targets] : allEnvTargets(),
    state: "stored",
  }))
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
export function toEnvMap(rows: readonly EnvRow[]): Record<string, EnvVarInput> {
  const out: Record<string, EnvVarInput> = {}
  for (const row of rows) {
    const key = row.key.trim()
    if (key === "") continue
    out[key] = {
      value: row.value,
      // An empty list would be read as "every deployment" server-side, which is
      // the opposite of what an empty row of toggles looks like it means.
      targets: row.targets.length > 0 ? [...row.targets] : allEnvTargets(),
    }
  }
  return out
}
