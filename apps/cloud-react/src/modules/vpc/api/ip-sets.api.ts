import { apiDelete, apiGet, apiPost, apiPut, LIST_QUERY } from "@/services/api/client"

import type {
  AddIpSetEntriesRequest,
  AddIpSetEntriesResult,
  CreateIpSetRequest,
  IpSet,
  IpSetEntry,
  UpdateIpSetRequest,
} from "../vpc.types"

const IP_SETS_BASE = "/vpc/ipsets"

/** Backend IpSet row. Entries are expanded on the detail read only — the list
 *  endpoint returns the set without them, so a page of sets does not drag every
 *  CIDR in the account down with it. */
interface RawIpSet extends Omit<IpSet, "entries"> {
  entries?: IpSetEntry[]
}

function toIpSet(raw: RawIpSet): IpSet {
  return {
    ...raw,
    entries: raw.entries,
    // A set with no entries matches nothing, which is worth showing in the list
    // rather than leaving the column blank and ambiguous.
    entry_count: raw.entry_count ?? raw.entries?.length ?? 0,
  }
}

export const ipSetsApi = {
  list: async (): Promise<IpSet[]> => {
    const rows = await apiGet<RawIpSet[]>(IP_SETS_BASE + LIST_QUERY)
    return rows.map(toIpSet)
  },

  get: async (id: string): Promise<IpSet> => toIpSet(await apiGet<RawIpSet>(`${IP_SETS_BASE}/${id}`)),

  create: async (payload: CreateIpSetRequest): Promise<IpSet> =>
    toIpSet(
      await apiPost<RawIpSet>(IP_SETS_BASE, {
        name: payload.name,
        description: payload.description ?? "",
        ip_version: payload.ip_version,
      }),
    ),

  update: async (id: string, payload: UpdateIpSetRequest): Promise<IpSet> => {
    const body: Record<string, unknown> = {}
    if (payload.name !== undefined) body.name = payload.name
    if (payload.description !== undefined) body.description = payload.description
    return toIpSet(await apiPut<RawIpSet>(`${IP_SETS_BASE}/${id}`, body))
  },

  delete: (id: string): Promise<void> => apiDelete(`${IP_SETS_BASE}/${id}`),

  /** One entry and a pasted list are the same call. The result reports what was
   *  added, what was skipped as a duplicate, and what was rejected — a partial
   *  success is the normal outcome and the caller should show all three. */
  addEntries: (id: string, payload: AddIpSetEntriesRequest): Promise<AddIpSetEntriesResult> =>
    apiPost<AddIpSetEntriesResult>(`${IP_SETS_BASE}/${id}/entries`, payload),

  removeEntry: (id: string, entryId: string): Promise<void> =>
    apiDelete(`${IP_SETS_BASE}/${id}/entries/${entryId}`),
}
