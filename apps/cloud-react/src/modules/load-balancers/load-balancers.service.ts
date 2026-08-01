import { lbApi } from "./load-balancers.api"
import type {
  CreateListenerRequest,
  CreateLoadBalancerRequest,
  UpdateListenerRequest,
  UpdateLoadBalancerRequest,
} from "./load-balancers.types"

export const lbService = {
  fetchAll: () => lbApi.list(),
  fetchById: (id: string) => lbApi.get(id),
  create: (payload: CreateLoadBalancerRequest) => lbApi.create(payload),
  update: (id: string, payload: UpdateLoadBalancerRequest) => lbApi.update(id, payload),
  remove: (id: string) => lbApi.delete(id),

  fetchSubnets: (id: string) => lbApi.subnets(id),

  fetchListeners: (id: string) => lbApi.listeners(id),
  createListener: (id: string, payload: CreateListenerRequest) => lbApi.createListener(id, payload),
  updateListener: (id: string, listenerId: string, payload: UpdateListenerRequest) =>
    lbApi.updateListener(id, listenerId, payload),
  removeListener: (id: string, listenerId: string) => lbApi.deleteListener(id, listenerId),
}
