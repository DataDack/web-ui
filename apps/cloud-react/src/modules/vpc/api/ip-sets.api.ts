import { apiDelete, apiGet, apiPost, apiPut, LIST_QUERY } from "@/services/api/client"

import type {
  AddIPSetEntriesRequest,
  AddIPSetEntriesResult,
  CreateIPSetRequest,
  IPSet,
  IPSetEntry,
  UpdateIPSetRequest,
} from "../vpc.types"

const IP_SETS_BASE = "/vpc/ipsets"

/** Backend IPSet row. Entries are expanded on the detail read only — the list
 *  endpoint returns the set without them, so a page of sets does not drag every
 *  CIDR in the account down with it. */
interface RawIPSet extends Omit<IPSet, "entries"> {
  entries?: IPSetEntry[]
}

function toIPSet(raw: RawIPSet): IPSet {
  return {
    ...raw,
    description: raw.description ?? "",
    entries: raw.entries,
    // A set with no entries matches nothing, which is worth showing in the list
    // rather than leaving the column blank and ambiguous.
    entry_count: raw.entry_count ?? raw.entries?.length ?? 0,
  }
}

export const ipSetsApi = {
  list: async (): Promise<IPSet[]> => {
    const rows = await apiGet<RawIPSet[]>(IP_SETS_BASE + LIST_QUERY)
    return rows.map(toIPSet)
  },

  get: async (id: string): Promise<IPSet> => toIPSet(await apiGet<RawIPSet>(`${IP_SETS_BASE}/${id}`)),

  create: async (payload: CreateIPSetRequest): Promise<IPSet> =>
    toIPSet(
      await apiPost<RawIPSet>(IP_SETS_BASE, {
        name: payload.name,
        description: payload.description ?? "",
        ip_version: payload.ip_version,
      }),
    ),

  update: async (id: string, payload: UpdateIPSetRequest): Promise<IPSet> => {
    const body: Record<string, unknown> = {}
    if (payload.name !== undefined) body.name = payload.name
    if (payload.description !== undefined) body.description = payload.description
    return toIPSet(await apiPut<RawIPSet>(`${IP_SETS_BASE}/${id}`, body))
  },

  delete: (id: string): Promise<void> => apiDelete(`${IP_SETS_BASE}/${id}`),

  /** One entry and a pasted list are the same call. The result reports what was
   *  added, what was skipped as a duplicate, and what was rejected — a partial
   *  success is the normal outcome and the caller should show all three. */
  addEntries: (id: string, payload: AddIPSetEntriesRequest): Promise<AddIPSetEntriesResult> =>
    apiPost<AddIPSetEntriesResult>(`${IP_SETS_BASE}/${id}/entries`, payload),

  removeEntry: (id: string, entryId: string): Promise<void> =>
    apiDelete(`${IP_SETS_BASE}/${id}/entries/${entryId}`),
}
