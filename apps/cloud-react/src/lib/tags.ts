// The Go backend serializes tags as a JSON object (entity field `base.Tags`).
// For backward compatibility this also accepts the legacy JSONB-serialized
// string form. These helpers are the single conversion point.

export interface TagRow {
  key: string
  value: string
}

/** A tags value as it may arrive from the API: an object map, the legacy
 *  JSON-string form, or absent. */
export type TagsInput = Record<string, unknown> | string | undefined | null

function recordFrom(obj: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, String(v)]))
}

export function parseTags(tags: TagsInput): Record<string, string> {
  if (!tags) return {}
  // New backend shape: already a JSON object.
  if (typeof tags === "object") {
    return Array.isArray(tags) ? {} : recordFrom(tags)
  }
  // Legacy shape: a JSON-encoded string.
  try {
    const parsed: unknown = JSON.parse(tags)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return recordFrom(parsed as Record<string, unknown>)
    }
    return {}
  } catch {
    return {}
  }
}

export function stringifyTags(tags: Record<string, string>): string {
  return JSON.stringify(tags)
}

export function tagRowsToRecord(rows: TagRow[]): Record<string, string> {
  const record: Record<string, string> = {}
  for (const row of rows) {
    if (row.key.trim()) record[row.key.trim()] = row.value.trim()
  }
  return record
}

export function recordToTagRows(record: Record<string, string>): TagRow[] {
  const rows = Object.entries(record).map(([key, value]) => ({ key, value }))
  return rows.length > 0 ? rows : [{ key: "", value: "" }]
}
