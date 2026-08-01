import { targetGroupsApi } from "./target-groups.api"
import type {
    CreateTargetGroupRequest,
    RegisterTargetRequest,
    UpdateTargetGroupRequest,
} from "./target-groups.types"

export const targetGroupsService = {
    fetchAll: () => targetGroupsApi.list(),
    fetchById: (id: string) => targetGroupsApi.get(id),
    create: (payload: CreateTargetGroupRequest) => targetGroupsApi.create(payload),
    update: (id: string, payload: UpdateTargetGroupRequest) => targetGroupsApi.update(id, payload),
    remove: (id: string) => targetGroupsApi.delete(id),

    fetchTargets: (id: string) => targetGroupsApi.targets(id),
    registerTarget: (id: string, payload: RegisterTargetRequest) =>
        targetGroupsApi.registerTarget(id, payload),
    deregisterTarget: (id: string, targetId: string) =>
        targetGroupsApi.deregisterTarget(id, targetId),
}
