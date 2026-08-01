import { vmsApi } from "./vms.api"
import type { CreateInstanceRequest, InstanceAction, UpdateInstanceRequest } from "./vms.types"

export const vmsService = {
    fetchAll: () => vmsApi.list(),
    fetchStatus: () => vmsApi.status(),
    fetchById: (id: string) => vmsApi.get(id),
    fetchEvents: (id: string) => vmsApi.events(id),
    create: (payload: CreateInstanceRequest) => vmsApi.create(payload),
    update: (id: string, payload: UpdateInstanceRequest) => vmsApi.update(id, payload),
    runAction: (id: string, action: InstanceAction) => vmsApi.action(id, action),
    remove: (id: string) => vmsApi.delete(id),
    fetchMetrics: (id: string, range: string) => vmsApi.metrics(id, range),
}
