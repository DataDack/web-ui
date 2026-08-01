import { asgApi } from "./autoscaling.api"
import type { CreateASGRequest } from "./autoscaling.types"

export const asgService = {
  fetchAll: () => asgApi.list(),
  fetchById: (id: string) => asgApi.get(id),
  create: (payload: CreateASGRequest) => asgApi.create(payload),
  // Backend has no dedicated capacity endpoint; desired capacity is changed via
  // the generic PUT /:id partial update (dto.UpdateASGRequest).
  setCapacity: (id: string, desiredCapacity: number) =>
    asgApi.update(id, { desired_capacity: desiredCapacity }),
  remove: (id: string) => asgApi.delete(id),
}
