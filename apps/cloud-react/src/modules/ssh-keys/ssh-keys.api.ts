import { apiDelete, apiGet, apiPost, LIST_QUERY } from "@/services/api/client"

import type { CreateSSHKeyRequest, SSHKey } from "./ssh-keys.types"

// Backend: app `compute`, module `sshkeys` → base path `/compute/sshkeys`.
// Routes (apps/compute/sshkeys/sshkeys_module.go):
//   GET    /compute/sshkeys      list (paginated; array in `data`)
//   POST   /compute/sshkeys      create
//   GET    /compute/sshkeys/:id  get by id
//   DELETE /compute/sshkeys/:id  delete
const BASE = "/compute/sshkeys"

// The backend returns numeric ids (`id`, `user_id`), but the FE treats every id
// as a string — zod schemas, Radix Select item values (which must be strings)
// and `===` lookups all assume strings. Normalize at the API boundary so the
// SSH-key picker renders and selects correctly.
interface RawSSHKey extends Omit<SSHKey, "id" | "user_id"> {
    id: number | string
    user_id: number | string
}

function toSSHKey(raw: RawSSHKey): SSHKey {
    return { ...raw, id: String(raw.id), user_id: String(raw.user_id) }
}

export const sshKeysApi = {
    list: async (): Promise<SSHKey[]> => {
        const rows = await apiGet<RawSSHKey[]>(`${BASE}${LIST_QUERY}`)
        return rows.map(toSSHKey)
    },

    create: async (payload: CreateSSHKeyRequest): Promise<SSHKey> =>
        toSSHKey(await apiPost<RawSSHKey>(BASE, payload)),

    delete: (id: string): Promise<void> => apiDelete(`${BASE}/${id}`),
}
