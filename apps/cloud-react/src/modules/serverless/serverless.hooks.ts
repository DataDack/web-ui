import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { handleQuotaGateError } from "@/modules/governance/quota-gate"
import { useActiveRegion } from "@/modules/region/region.context"
import { extractError } from "@/services/api/client"

import { serverlessApi } from "./serverless.api"
import type { CreateFunctionFromSourceRequest, CreateFunctionRequest } from "./serverless.types"

// The active region is part of every query key: switching regions in the
// console shell is a different data set, not a refetch of the same one.
export const SERVERLESS_QUERY_KEYS = {
  functions: (region: string | null) => ["serverless", region, "functions"] as const,
  fn: (region: string | null, name: string) => ["serverless", region, "functions", name] as const,
  versions: (region: string | null, name: string) =>
    ["serverless", region, "functions", name, "versions"] as const,
  aliases: (region: string | null, name: string) =>
    ["serverless", region, "functions", name, "aliases"] as const,
  layers: (region: string | null) => ["serverless", region, "layers"] as const,
  runtimes: (region: string | null) => ["serverless", region, "runtimes"] as const,
  activity: ["serverless", "activity"] as const,
}

export function useCreateFunction() {
  const queryClient = useQueryClient()
  const { activeRegionCode } = useActiveRegion()
  return useMutation({
    mutationFn: (body: CreateFunctionRequest) =>
      serverlessApi.createFunction(activeRegionCode, body),
    onSuccess: async (_data, body) => {
      toast.success(`Function ${body.name} deployed`)
      await queryClient.invalidateQueries({
        queryKey: SERVERLESS_QUERY_KEYS.functions(activeRegionCode),
      })
    },
    onError: (error) => {
      // The quota gate renders its own persistent upgrade toast.
      if (handleQuotaGateError(error)) return
      toast.error(extractError(error, "Could not deploy the function"))
    },
  })
}

export function useCreateFunctionFromSource() {
  const queryClient = useQueryClient()
  const { activeRegionCode } = useActiveRegion()
  return useMutation({
    mutationFn: (body: CreateFunctionFromSourceRequest) =>
      serverlessApi.createFunctionFromSource(activeRegionCode, body),
    onSuccess: async (_data, body) => {
      toast.success(`Function ${body.name} deployed`)
      await queryClient.invalidateQueries({
        queryKey: SERVERLESS_QUERY_KEYS.functions(activeRegionCode),
      })
    },
    onError: (error) => {
      if (handleQuotaGateError(error)) return
      toast.error(extractError(error, "Could not deploy the function"))
    },
  })
}
