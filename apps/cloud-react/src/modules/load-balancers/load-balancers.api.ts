import { apiDelete, apiGet, apiPost, apiPut, LIST_QUERY } from "@/services/api/client"

import type {
    CreateListenerRequest,
    CreateLoadBalancerRequest,
    LBListener,
    LBSubnet,
    LoadBalancer,
    UpdateListenerRequest,
    UpdateLoadBalancerRequest,
} from "./load-balancers.types"

// cloud-be-go: app "compute", module "loadbalancer" -> base /compute/loadbalancer.
// Load balancer:  GET / · POST / · GET /:id · PUT /:id · DELETE /:id
// Listeners:      GET /:id/listeners · POST /:id/listeners
//                 PUT /:id/listeners/:listenerId · DELETE /:id/listeners/:listenerId
// Subnets:        GET /:id/subnets  (vm_lb_subnets rows — one per attached subnet)
//
// Targets are NOT here: they belong to a target group, which is a standalone
// resource (see modules/target-groups). A group can back several load balancers.
const BASE = "/compute/loadbalancer"

export const lbApi = {
    list: (): Promise<LoadBalancer[]> => apiGet<LoadBalancer[]>(`${BASE}${LIST_QUERY}`),

    get: (id: string): Promise<LoadBalancer> => apiGet<LoadBalancer>(`${BASE}/${id}`),

    create: (payload: CreateLoadBalancerRequest): Promise<LoadBalancer> =>
        apiPost<LoadBalancer>(BASE, payload),

    update: (id: string, payload: UpdateLoadBalancerRequest): Promise<LoadBalancer> =>
        apiPut<LoadBalancer>(`${BASE}/${id}`, payload),

    delete: (id: string): Promise<void> => apiDelete(`${BASE}/${id}`),

    subnets: (id: string): Promise<LBSubnet[]> =>
        apiGet<LBSubnet[]>(`${BASE}/${id}/subnets`),

    listeners: (id: string): Promise<LBListener[]> =>
        apiGet<LBListener[]>(`${BASE}/${id}/listeners`),

    createListener: (id: string, payload: CreateListenerRequest): Promise<LBListener> =>
        apiPost<LBListener>(`${BASE}/${id}/listeners`, payload),

    updateListener: (
        id: string,
        listenerId: string,
        payload: UpdateListenerRequest,
    ): Promise<LBListener> =>
        apiPut<LBListener>(`${BASE}/${id}/listeners/${listenerId}`, payload),

    deleteListener: (id: string, listenerId: string): Promise<void> =>
        apiDelete(`${BASE}/${id}/listeners/${listenerId}`),
}
