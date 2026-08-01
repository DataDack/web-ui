import { disksApi } from "./disks.api"
import type { CreateDiskRequest } from "./disks.types"

export const disksService = {
    fetchAll: () => disksApi.list(),
    create: (payload: CreateDiskRequest) => disksApi.create(payload),
    attach: (id: string, instanceId: string) => disksApi.attach(id, instanceId),
    detach: (id: string) => disksApi.detach(id),
    remove: (id: string) => disksApi.delete(id),
}
