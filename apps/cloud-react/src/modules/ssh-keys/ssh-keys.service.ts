import { sshKeysApi } from "./ssh-keys.api"
import type { CreateSSHKeyRequest } from "./ssh-keys.types"

export const sshKeysService = {
    fetchAll: () => sshKeysApi.list(),
    create: (payload: CreateSSHKeyRequest) => sshKeysApi.create(payload),
    remove: (id: string) => sshKeysApi.delete(id),
}
