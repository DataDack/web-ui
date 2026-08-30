import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { getStatusConfig } from "@/components/console/status-config"
import { handleQuotaGateError } from "@/modules/governance/quota-gate"
import { useActiveRegion } from "@/modules/region/region.context"
import { extractError } from "@/services/api/client"

import { serverlessApi } from "./serverless.api"
import type {
  CreateFunctionFromSourceRequest,
  CreateFunctionRequest,
  PresignedUpload,
  PublishLayerRequest,
  PutAliasRequest,
} from "./serverless.types"

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

export function useServerlessFunctions() {
  const { activeRegionCode } = useActiveRegion()
  return useQuery({
    queryKey: SERVERLESS_QUERY_KEYS.functions(activeRegionCode),
    queryFn: () => serverlessApi.listFunctions(activeRegionCode),
    // Deploys settle server-side (the FaaS control plane owns the state
    // machine), so the list keeps itself fresh instead of relying on a
    // mutation to invalidate it.
    refetchInterval: 30_000,
  })
}

export function useServerlessFunction(name: string) {
  const { activeRegionCode } = useActiveRegion()
  return useQuery({
    queryKey: SERVERLESS_QUERY_KEYS.fn(activeRegionCode, name),
    queryFn: () => serverlessApi.getFunction(activeRegionCode, name),
    enabled: name !== "",
    // The list above polls; the detail page used not to, so a function opened
    // while it was still Draft kept that badge for the life of the page. Draft
    // ends when a worker reports a ready sandbox — seconds later, on a
    // heartbeat, with nothing the console can react to. Poll only while the
    // state is one the badge already renders as in-flight, and go quiet once
    // it settles.
    refetchInterval: (query) => (getStatusConfig(query.state.data?.state).busy ? 5_000 : false),
  })
}

export function useFunctionVersions(name: string) {
  const { activeRegionCode } = useActiveRegion()
  return useQuery({
    queryKey: SERVERLESS_QUERY_KEYS.versions(activeRegionCode, name),
    queryFn: () => serverlessApi.listVersions(activeRegionCode, name),
    enabled: name !== "",
  })
}

export function useFunctionAliases(name: string) {
  const { activeRegionCode } = useActiveRegion()
  return useQuery({
    queryKey: SERVERLESS_QUERY_KEYS.aliases(activeRegionCode, name),
    queryFn: () => serverlessApi.listAliases(activeRegionCode, name),
    enabled: name !== "",
  })
}

export function useServerlessLayers() {
  const { activeRegionCode } = useActiveRegion()
  return useQuery({
    queryKey: SERVERLESS_QUERY_KEYS.layers(activeRegionCode),
    queryFn: () => serverlessApi.listLayers(activeRegionCode),
  })
}

/**
 * Deletes one published layer version.
 *
 * Already-deployed functions keep running: a function captured the layer's
 * content when it was published, so this breaks the next deploy that names this
 * version rather than anything currently serving. That is Lambda's behaviour and
 * the control plane deliberately does not check for referencing functions.
 */
export function useDeleteLayerVersion() {
  const queryClient = useQueryClient()
  const { activeRegionCode } = useActiveRegion()
  return useMutation({
    mutationFn: ({ name, version }: { name: string; version: number }) =>
      serverlessApi.deleteLayerVersion(activeRegionCode, name, version),
    onSuccess: async (_data, { name, version }) => {
      toast.success(`Layer ${name} v${String(version)} deleted`)
      await queryClient.invalidateQueries({
        queryKey: SERVERLESS_QUERY_KEYS.layers(activeRegionCode),
      })
    },
    onError: (error) => toast.error(extractError(error, "Could not delete the layer version")),
  })
}

export function useServerlessActivity() {
  return useQuery({
    queryKey: SERVERLESS_QUERY_KEYS.activity,
    queryFn: serverlessApi.activity,
  })
}

export function useDeleteFunction() {
  const queryClient = useQueryClient()
  const { activeRegionCode } = useActiveRegion()
  return useMutation({
    mutationFn: (name: string) => serverlessApi.deleteFunction(activeRegionCode, name),
    onSuccess: async (_data, name) => {
      toast.success(`Function ${name} deleted`)
      await queryClient.invalidateQueries({
        queryKey: SERVERLESS_QUERY_KEYS.functions(activeRegionCode),
      })
    },
    onError: (error) => toast.error(extractError(error, "Could not delete the function")),
  })
}

/** The deployable runtime catalog backing the create form's picker. */
export function useServerlessRuntimes() {
  const { activeRegionCode } = useActiveRegion()
  return useQuery({
    queryKey: SERVERLESS_QUERY_KEYS.runtimes(activeRegionCode),
    queryFn: () => serverlessApi.listRuntimes(activeRegionCode),
    staleTime: 5 * 60_000, // the catalog changes on control-plane releases, not per click
  })
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

export function usePublishLayer() {
  const queryClient = useQueryClient()
  const { activeRegionCode } = useActiveRegion()
  return useMutation({
    mutationFn: (body: PublishLayerRequest) => serverlessApi.publishLayer(activeRegionCode, body),
    onSuccess: async (_data, body) => {
      toast.success(`Layer ${body.name} published`)
      await queryClient.invalidateQueries({
        queryKey: SERVERLESS_QUERY_KEYS.layers(activeRegionCode),
      })
    },
    onError: (error) => {
      if (handleQuotaGateError(error)) return
      toast.error(extractError(error, "Could not publish the layer"))
    },
  })
}

/**
 * Presign + browser PUT in one step. The archive goes straight to the FaaS
 * object store; the mutation resolves to the {bucket, key} reference a
 * create/publish body embeds.
 */
export function useUploadArtifact() {
  const { activeRegionCode } = useActiveRegion()
  return useMutation({
    mutationFn: async ({ kind, file }: { kind: "functions" | "layers"; file: File }) => {
      const slot: PresignedUpload = await serverlessApi.presignUpload(activeRegionCode, {
        kind,
        filename: file.name,
        contentType: file.type || "application/zip",
      })
      await serverlessApi.uploadArtifact(slot, file)
      return { bucket: slot.bucket, key: slot.key }
    },
    onError: (error) => toast.error(extractError(error, "Artifact upload failed")),
  })
}

export function usePutAlias(fn: string) {
  const queryClient = useQueryClient()
  const { activeRegionCode } = useActiveRegion()
  return useMutation({
    mutationFn: (body: PutAliasRequest) => serverlessApi.putAlias(activeRegionCode, fn, body),
    onSuccess: async (_data, body) => {
      toast.success(`Alias ${body.name} saved`)
      await queryClient.invalidateQueries({
        queryKey: SERVERLESS_QUERY_KEYS.aliases(activeRegionCode, fn),
      })
    },
    onError: (error) => toast.error(extractError(error, "Could not save the alias")),
  })
}

export function useDeleteAlias(fn: string) {
  const queryClient = useQueryClient()
  const { activeRegionCode } = useActiveRegion()
  return useMutation({
    mutationFn: (alias: string) => serverlessApi.deleteAlias(activeRegionCode, fn, alias),
    onSuccess: async (_data, alias) => {
      toast.success(`Alias ${alias} deleted`)
      await queryClient.invalidateQueries({
        queryKey: SERVERLESS_QUERY_KEYS.aliases(activeRegionCode, fn),
      })
    },
    onError: (error) => toast.error(extractError(error, "Could not delete the alias")),
  })
}

export function useInvokeFunction(fn: string) {
  const { activeRegionCode } = useActiveRegion()
  return useMutation({
    mutationFn: (payload: string) => serverlessApi.invoke(activeRegionCode, fn, payload),
    // No onError toast: invoke never rejects on a function-level failure —
    // the tester shows whatever came back. A rejection here is transport.
    onError: (error) => toast.error(extractError(error, "Invoke did not reach the platform")),
  })
}
