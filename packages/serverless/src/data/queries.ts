import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useServerlessContext } from "./transport"
import type {
  ArtifactRef,
  CreateFromPackageInput,
  CreateFromSourceInput,
  CreatedFunction,
  FunctionAlias,
  FunctionEntity,
  FunctionVersion,
  InvokeResult,
  PutAliasInput,
  RuntimeInfo,
  Trigger,
  UpdateFunctionConfigInput,
} from "./types"

/**
 * Query keys for the shared serverless data.
 *
 * Scoped by a caller-supplied `scope` string so a console that partitions its
 * cache — cloud-react keys everything by active region — does not serve one
 * region's catalog for another. Consoles with a single control plane pass
 * nothing and get a stable key.
 *
 * Per-function keys are children of `functions(scope)` on purpose: every
 * existing "invalidate the functions list" call sweeps the whole subtree, so a
 * create or delete refreshes any detail data that survived it.
 */
export const serverlessKeys = {
  runtimes: (scope = "default") => ["datadack-serverless", "runtimes", scope] as const,
  functions: (scope = "default") => ["datadack-serverless", "functions", scope] as const,
  function: (name: string, scope?: string) => [...serverlessKeys.functions(scope), name] as const,
  versions: (name: string, scope?: string) =>
    [...serverlessKeys.functions(scope), name, "versions"] as const,
  aliases: (name: string, scope?: string) =>
    [...serverlessKeys.functions(scope), name, "aliases"] as const,
  triggers: (name: string, scope?: string) =>
    [...serverlessKeys.functions(scope), name, "triggers"] as const,
}

/**
 * The runtime catalog.
 *
 * `staleTime` is generous on purpose: the catalog changes when the control
 * plane ships a release, not while someone fills in a form.
 */
export function useRuntimes(scope?: string) {
  const { transport } = useServerlessContext()
  return useQuery<RuntimeInfo[]>({
    queryKey: serverlessKeys.runtimes(scope),
    queryFn: () => transport.listRuntimes(),
    staleTime: 5 * 60 * 1000,
  })
}

/** Create by having the control plane zip inline starter source. */
export function useCreateFromSource(scope?: string) {
  const { transport } = useServerlessContext()
  const queryClient = useQueryClient()
  return useMutation<CreatedFunction, unknown, CreateFromSourceInput>({
    mutationFn: (input) => transport.createFromSource(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: serverlessKeys.functions(scope) })
    },
  })
}

/**
 * Create from an uploaded archive or a container image.
 *
 * Throws if the console did not supply `createFromPackage`. That is a wiring
 * mistake rather than a user-facing failure — the capability flags keep the UI
 * that calls this from rendering at all — so it fails loudly instead of
 * silently resolving.
 */
export function useCreateFromPackage(scope?: string) {
  const { transport } = useServerlessContext()
  const queryClient = useQueryClient()
  return useMutation<CreatedFunction, unknown, CreateFromPackageInput>({
    mutationFn: (input) => {
      if (!transport.createFromPackage) {
        throw new Error("This console's serverless transport has no createFromPackage")
      }
      return transport.createFromPackage(input)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: serverlessKeys.functions(scope) })
    },
  })
}

/** Upload a .zip to the artifact store and return its reference. */
export function useUploadArtifact() {
  const { transport } = useServerlessContext()
  return useMutation<ArtifactRef, unknown, File>({
    mutationFn: (file) => {
      if (!transport.uploadArtifact) {
        throw new Error("This console's serverless transport has no uploadArtifact")
      }
      return transport.uploadArtifact(file)
    },
  })
}

/**
 * One function, by name.
 *
 * `enabled`-gated on both the name and the transport method: a console that
 * did not wire `getFunction` renders no detail surface (capability flags), so
 * the query must never fire and fill the cache with thrown errors.
 */
export function useFunction(name: string, scope?: string) {
  const { transport } = useServerlessContext()
  return useQuery<FunctionEntity>({
    queryKey: serverlessKeys.function(name, scope),
    queryFn: () => {
      if (!transport.getFunction) {
        throw new Error("This console's serverless transport has no getFunction")
      }
      return transport.getFunction(name)
    },
    enabled: name !== "" && !!transport.getFunction,
  })
}

/** Published versions of a function. */
export function useFunctionVersions(name: string, scope?: string) {
  const { transport } = useServerlessContext()
  return useQuery<FunctionVersion[]>({
    queryKey: serverlessKeys.versions(name, scope),
    queryFn: () => {
      if (!transport.listVersions) {
        throw new Error("This console's serverless transport has no listVersions")
      }
      return transport.listVersions(name)
    },
    enabled: name !== "" && !!transport.listVersions,
  })
}

/** Aliases of a function. */
export function useFunctionAliases(name: string, scope?: string) {
  const { transport } = useServerlessContext()
  return useQuery<FunctionAlias[]>({
    queryKey: serverlessKeys.aliases(name, scope),
    queryFn: () => {
      if (!transport.listAliases) {
        throw new Error("This console's serverless transport has no listAliases")
      }
      return transport.listAliases(name)
    },
    enabled: name !== "" && !!transport.listAliases,
  })
}

/** Event-source triggers wired to a function. */
export function useFunctionTriggers(name: string, scope?: string) {
  const { transport } = useServerlessContext()
  return useQuery<Trigger[]>({
    queryKey: serverlessKeys.triggers(name, scope),
    queryFn: () => {
      if (!transport.listTriggers) {
        throw new Error("This console's serverless transport has no listTriggers")
      }
      return transport.listTriggers(name)
    },
    enabled: name !== "" && !!transport.listTriggers,
  })
}

/** Create or update an alias — the control plane upserts by name. */
export function usePutAlias(name: string, scope?: string) {
  const { transport } = useServerlessContext()
  const queryClient = useQueryClient()
  return useMutation<FunctionAlias, unknown, PutAliasInput>({
    mutationFn: (input) => {
      if (!transport.putAlias) {
        throw new Error("This console's serverless transport has no putAlias")
      }
      return transport.putAlias(name, input)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: serverlessKeys.aliases(name, scope) })
    },
  })
}

/** Delete one alias of a function. The mutation variable is the alias name. */
export function useDeleteAlias(name: string, scope?: string) {
  const { transport } = useServerlessContext()
  const queryClient = useQueryClient()
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void mirrors the transport's Promise<void>; the rule only whitelists void on type references, not call-site generics
  return useMutation<void, unknown, string>({
    mutationFn: (alias) => {
      if (!transport.deleteAlias) {
        throw new Error("This console's serverless transport has no deleteAlias")
      }
      return transport.deleteAlias(name, alias)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: serverlessKeys.aliases(name, scope) })
    },
  })
}

/** Delete a function. The mutation variable is the function name. */
export function useDeleteFunction(scope?: string) {
  const { transport } = useServerlessContext()
  const queryClient = useQueryClient()
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- void mirrors the transport's Promise<void>; the rule only whitelists void on type references, not call-site generics
  return useMutation<void, unknown, string>({
    mutationFn: (name) => {
      if (!transport.deleteFunction) {
        throw new Error("This console's serverless transport has no deleteFunction")
      }
      return transport.deleteFunction(name)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: serverlessKeys.functions(scope) })
    },
  })
}

/**
 * Synchronously invoke with a raw payload (the mutation variable). No cache
 * invalidation — an invocation changes nothing the console has cached; the
 * scope parameter exists only for signature parity with the other hooks.
 */
export function useInvokeFunction(name: string, _scope?: string) {
  const { transport } = useServerlessContext()
  return useMutation<InvokeResult, unknown, string>({
    mutationFn: (payload) => {
      if (!transport.invokeFunction) {
        throw new Error("This console's serverless transport has no invokeFunction")
      }
      return transport.invokeFunction(name, payload)
    },
  })
}

/**
 * In-place config update. The PATCH returns the updated function, so it is
 * written straight into the detail cache before the invalidations — the form
 * exits edit mode against fresh data with no refetch flash. Versions are
 * invalidated too as harmless safety should a transport ever save via
 * re-deploy semantics.
 */
export function useUpdateFunctionConfig(name: string, scope?: string) {
  const { transport } = useServerlessContext()
  const queryClient = useQueryClient()
  return useMutation<FunctionEntity, unknown, UpdateFunctionConfigInput>({
    mutationFn: (patch) => {
      if (!transport.updateFunctionConfig) {
        throw new Error("This console's serverless transport has no updateFunctionConfig")
      }
      return transport.updateFunctionConfig(name, patch)
    },
    onSuccess: (result) => {
      queryClient.setQueryData(serverlessKeys.function(name, scope), result)
      void queryClient.invalidateQueries({ queryKey: serverlessKeys.function(name, scope) })
      void queryClient.invalidateQueries({ queryKey: serverlessKeys.versions(name, scope) })
      void queryClient.invalidateQueries({ queryKey: serverlessKeys.functions(scope) })
    },
  })
}
