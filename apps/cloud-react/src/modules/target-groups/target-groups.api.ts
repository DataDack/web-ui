import { apiDelete, apiGet, apiPost, apiPut, LIST_QUERY } from "@/services/api/client"

import type {
    CreateTargetGroupRequest,
    RegisterTargetRequest,
    Target,
    TargetGroup,
    UpdateTargetGroupRequest,
} from "./target-groups.types"

// Target groups are served by the loadbalancer module but are a standalone
// collection under it, mirroring the backend's routes:
//   GET/POST   /compute/loadbalancer/targetgroups
//   GET/PUT/DELETE /compute/loadbalancer/targetgroups/:tgId
//   GET/POST   /compute/loadbalancer/targetgroups/:tgId/targets
//   DELETE     /compute/loadbalancer/targetgroups/:tgId/targets/:targetId
const BASE = "/compute/loadbalancer/targetgroups"

export const targetGroupsApi = {
    list: (): Promise<TargetGroup[]> => apiGet<TargetGroup[]>(`${BASE}${LIST_QUERY}`),

    get: (id: string): Promise<TargetGroup> => apiGet<TargetGroup>(`${BASE}/${id}`),

    create: (payload: CreateTargetGroupRequest): Promise<TargetGroup> =>
        apiPost<TargetGroup>(BASE, payload),

    update: (id: string, payload: UpdateTargetGroupRequest): Promise<TargetGroup> =>
        apiPut<TargetGroup>(`${BASE}/${id}`, payload),

    delete: (id: string): Promise<void> => apiDelete(`${BASE}/${id}`),

    targets: (id: string): Promise<Target[]> => apiGet<Target[]>(`${BASE}/${id}/targets`),

    registerTarget: (id: string, payload: RegisterTargetRequest): Promise<Target> =>
        apiPost<Target>(`${BASE}/${id}/targets`, payload),

    deregisterTarget: (id: string, targetId: string): Promise<void> =>
        apiDelete(`${BASE}/${id}/targets/${targetId}`),
}
