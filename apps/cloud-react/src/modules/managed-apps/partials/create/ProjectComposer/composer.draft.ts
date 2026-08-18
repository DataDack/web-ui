import type { ComposerValues } from "./schema"
import { CREATE_DRAFT_KEY, ENV_TARGETS } from "../../../managed-apps.constants"
import type { EnvTarget } from "../../../managed-apps.types"

/**
 * The composer draft, stashed across the GitHub App install round-trip.
 *
 * Connecting an account navigates the browser off the SPA entirely, so
 * everything typed so far would otherwise be lost — which is exactly when it
 * hurts most, because the user only left to grant access to the repo they were
 * in the middle of configuring.
 *
 * Environment variable VALUES are deliberately excluded. They are secrets, and
 * sessionStorage is readable by any script on the origin; the keys come back so
 * the rows survive, and the values are re-entered. That trade is stated in the
 * UI rather than made silently. The targets come back with the keys — where a
 * variable applies is a choice about the deployment, not a secret, and losing
 * it would silently widen a scope the user had narrowed.
 */
type DraftValues = Omit<ComposerValues, "env"> & {
  env: { key: string; targets: EnvTarget[] }[]
}

export function saveDraft(values: ComposerValues): void {
  const draft: DraftValues = {
    ...values,
    env: values.env.map((row) => ({ key: row.key, targets: row.targets })),
  }
  try {
    sessionStorage.setItem(CREATE_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // A full or disabled sessionStorage must never break the form; the
    // round-trip simply loses the draft, which is the pre-existing behaviour.
  }
}

export function readDraft(): Partial<ComposerValues> | null {
  try {
    const raw = sessionStorage.getItem(CREATE_DRAFT_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== "object" || parsed === null) return null

    // Everything here came out of JSON, so nothing is guaranteed — a draft
    // written by an older build of the app is still readable, and a
    // malformed one degrades to "no draft" rather than throwing mid-render.
    const { env, ...rest } = parsed as Record<string, unknown>
    const stashed = Array.isArray(env) ? env.flatMap(readDraftEnvRow) : []

    return {
      ...(rest as Partial<ComposerValues>),
      // Values were never stored — rehydrate the rows empty so the user
      // can see which variables they still have to re-enter.
      env: stashed.map((row) => ({ ...row, value: "" })),
    }
  } catch {
    return null
  }
}

/**
 * One stashed row, or nothing. A draft written by an older build carries no
 * targets at all, so a missing or unrecognisable list rehydrates as every
 * deployment — the same reading the API gives an unscoped variable.
 */
function readDraftEnvRow(row: unknown): { key: string; targets: EnvTarget[] }[] {
  if (typeof row !== "object" || row === null) return []
  if (!("key" in row) || typeof row.key !== "string") return []

  const raw: unknown[] = "targets" in row && Array.isArray(row.targets) ? row.targets : []
  const targets = ENV_TARGETS.filter((target) => raw.includes(target))
  return [{ key: row.key, targets: targets.length > 0 ? [...targets] : [...ENV_TARGETS] }]
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(CREATE_DRAFT_KEY)
  } catch {
    // Nothing to do — a draft we cannot clear is harmless.
  }
}
