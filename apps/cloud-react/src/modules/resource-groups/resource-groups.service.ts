import { resourceGroupsApi } from "./resource-groups.api"
import type {
  CreateResourceGroupPayload,
  UpdateResourceGroupPayload,
} from "./resource-groups.types"

export const resourceGroupsService = {
  fetchAll: () => resourceGroupsApi.list(),
  fetchById: (id: string) => resourceGroupsApi.get(id),
  fetchResources: (id: string) => resourceGroupsApi.listResources(id),
  create: (payload: CreateResourceGroupPayload) => resourceGroupsApi.create(payload),
  update: (id: string, payload: UpdateResourceGroupPayload) =>
    resourceGroupsApi.update(id, payload),
  remove: (id: string) => resourceGroupsApi.delete(id),
}
