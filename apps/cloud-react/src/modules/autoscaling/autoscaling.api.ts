import { apiDelete, apiGet, apiPost, apiPut, LIST_QUERY } from "@/services/api/client"

import type { AutoScalingGroup, CreateASGRequest, UpdateASGRequest } from "./autoscaling.types"

// cloud-be-go: app `compute`, module `autoscaling` → base `/compute/autoscaling`.
const BASE = "/compute/autoscaling"

export const asgApi = {
  list: (): Promise<AutoScalingGroup[]> => apiGet<AutoScalingGroup[]>(`${BASE}${LIST_QUERY}`),

  get: (id: string): Promise<AutoScalingGroup> => apiGet<AutoScalingGroup>(`${BASE}/${id}`),

  create: (payload: CreateASGRequest): Promise<AutoScalingGroup> =>
    apiPost<AutoScalingGroup>(BASE, payload),

  update: (id: string, payload: UpdateASGRequest): Promise<AutoScalingGroup> =>
    apiPut<AutoScalingGroup>(`${BASE}/${id}`, payload),

  delete: (id: string): Promise<void> => apiDelete(`${BASE}/${id}`),
}
