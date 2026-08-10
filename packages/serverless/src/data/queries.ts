import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { getStatusConfig } from "@datadack/common-ui"

import { useServerlessContext } from "./transport"
import type {
  ArtifactRef,
  CreateFromPackageInput,
  CreateFromSourceInput,
  CreatedFunction,
  FunctionAlias,
  FunctionCode,
  FunctionCodeFile,
  FunctionEntity,
  FunctionUrl,
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
  functionUrls: (name: string, scope?: string) =>
    [...serverlessKeys.functions(scope), name, "urls"] as const,
  versions: (name: string, scope?: string) =>
    [...serverlessKeys.functions(scope), name, "versions"] as const,
  aliases: (name: string, scope?: string) =>
    [...serverlessKeys.functions(scope), name, "aliases"] as const,
  triggers: (name: string, scope?: string) =>
    [...serverlessKeys.functions(scope), name, "triggers"] as const,
  code: (name: string, scope?: string) =>
    [...serverlessKeys.functions(scope), name, "code"] as const,
  codeFile: (name: string, path: string, scope?: string) =>
    [...serverlessKeys.code(name, scope), "file", path] as const,
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

/** How often a detail query re-asks while the resource is still settling. */
const SETTLING_POLL_MS = 5_000

/**
 * Poll interval for a resource whose state may still change on its own.
 *
 * A function is created Draft and only becomes Active when a worker reports a
 * ready sandbox — which happens on a heartbeat some seconds after the deploy
 * call returns, with nothing for the console to react to. A one-shot fetch
 * therefore left the badge reading "draft" on a function that was already
 * serving invocations, and only a manual reload corrected it.
 *
 * The condition is the shared in-flight vocabulary rather than a literal
 * "draft", so every transitional state the badge already renders with a
 * spinner — pending, updating, creating — resolves itself too. Settled states
 * return false and the query goes quiet.
 */
function settlingPollInterval(state?: string | null): number | false {
  return getStatusConfig(state).busy ? SETTLING_POLL_MS : false
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
    refetchInterval: (query) => settlingPollInterval(query.state.data?.state),
  })
}

/**
 * The hostnames that invoke a function.
 *
 * Gated on the transport implementing `listFunctionUrls`: a console wired to a
 * control plane without a function-URL surface must not fire this and fill the
 * cache with thrown errors.
 */
export function useFunctionUrls(name: string, scope?: string) {
  const { transport } = useServerlessContext()
  return useQuery<FunctionUrl[]>({
    queryKey: serverlessKeys.functionUrls(name, scope),
    queryFn: () => {
      if (!transport.listFunctionUrls) {
        throw new Error("This console's serverless transport has no listFunctionUrls")
      }
      return transport.listFunctionUrls(name)
    },
    enabled: name !== "" && !!transport.listFunctionUrls,
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

/* ── Inline code editing ────────────────────────────────────────────────────
 *
 * The control plane owns the draft: every mutating call returns the refreshed
 * `FunctionCode`, so these hooks write it straight into the cache instead of
 * invalidating and refetching. That matters more here than elsewhere — a
 * refetch flash in an editor loses the reader's place in the tree.
 */

/** The package tree, and whether it can be edited inline at all. */
export function useFunctionCode(name: string, scope?: string) {
  const { transport } = useServerlessContext()
  return useQuery<FunctionCode>({
    queryKey: serverlessKeys.code(name, scope),
    queryFn: () => {
      if (!transport.getFunctionCode) {
        throw new Error("This console's serverless transport has no getFunctionCode")
      }
      return transport.getFunctionCode(name)
    },
    enabled: name !== "" && !!transport.getFunctionCode,
  })
}

/**
 * One file's contents. Never goes stale on its own: the draft archive is the
 * source of truth and every write below rewrites this cache explicitly, so a
 * background refetch could only ever clobber the buffer someone is typing in.
 */
export function useFunctionCodeFile(name: string, path: string, scope?: string) {
  const { transport } = useServerlessContext()
  return useQuery<FunctionCodeFile>({
    queryKey: serverlessKeys.codeFile(name, path, scope),
    queryFn: () => {
      if (!transport.getFunctionCodeFile) {
        throw new Error("This console's serverless transport has no getFunctionCodeFile")
      }
      return transport.getFunctionCodeFile(name, path)
    },
    enabled: name !== "" && path !== "" && !!transport.getFunctionCodeFile,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
  })
}

/** What a file write carries: the path and its full new contents. */
export interface PutCodeFileInput {
  path: string
  content: string
}

/** Stage a file write into the draft archive. */
export function usePutFunctionCodeFile(name: string, scope?: string) {
  const { transport } = useServerlessContext()
  const queryClient = useQueryClient()
  return useMutation<FunctionCode, unknown, PutCodeFileInput>({
    mutationFn: ({ path, content }) => {
      if (!transport.putFunctionCodeFile) {
        throw new Error("This console's serverless transport has no putFunctionCodeFile")
      }
      return transport.putFunctionCodeFile(name, path, content)
    },
    onSuccess: (code, { path, content }) => {
      queryClient.setQueryData(serverlessKeys.code(name, scope), code)
      // The saved bytes ARE the file now; seeding the cache keeps a later
      // reopen of this tab from refetching what the browser just sent.
      queryClient.setQueryData<FunctionCodeFile>(serverlessKeys.codeFile(name, path, scope), {
        path,
        content,
        sizeBytes: new TextEncoder().encode(content).length,
        binary: false,
        draft: true,
      })
    },
  })
}

/** Stage a file deletion. The mutation variable is the path. */
export function useDeleteFunctionCodeFile(name: string, scope?: string) {
  const { transport } = useServerlessContext()
  const queryClient = useQueryClient()
  return useMutation<FunctionCode, unknown, string>({
    mutationFn: (path) => {
      if (!transport.deleteFunctionCodeFile) {
        throw new Error("This console's serverless transport has no deleteFunctionCodeFile")
      }
      return transport.deleteFunctionCodeFile(name, path)
    },
    onSuccess: (code, path) => {
      queryClient.setQueryData(serverlessKeys.code(name, scope), code)
      queryClient.removeQueries({ queryKey: serverlessKeys.codeFile(name, path, scope) })
    },
  })
}

/**
 * Throw the draft away. Every cached file goes with it — they were read from
 * the draft, and what replaces them is the deployed package.
 */
export function useDiscardCodeDraft(name: string, scope?: string) {
  const { transport } = useServerlessContext()
  const queryClient = useQueryClient()
  // No third type argument: the mutation takes no variables, which is already
  // this hook's default.
  return useMutation<FunctionCode, unknown>({
    mutationFn: () => {
      if (!transport.discardFunctionCodeDraft) {
        throw new Error("This console's serverless transport has no discardFunctionCodeDraft")
      }
      return transport.discardFunctionCodeDraft(name)
    },
    onSuccess: (code) => {
      queryClient.setQueryData(serverlessKeys.code(name, scope), code)
      queryClient.removeQueries({ queryKey: [...serverlessKeys.code(name, scope), "file"] })
    },
  })
}

/**
 * Publish the draft as a new version.
 *
 * The mutation variable is the deployed digest the session opened against;
 * pass undefined to deploy unconditionally. A stale digest comes back as the
 * control plane's 409 CodeStale, which the editor renders as a choice rather
 * than an error.
 */
export function useDeployCodeDraft(name: string, scope?: string) {
  const { transport } = useServerlessContext()
  const queryClient = useQueryClient()
  return useMutation<FunctionEntity, unknown, string | undefined>({
    mutationFn: (baseSha256) => {
      if (!transport.deployFunctionCodeDraft) {
        throw new Error("This console's serverless transport has no deployFunctionCodeDraft")
      }
      return transport.deployFunctionCodeDraft(name, baseSha256)
    },
    onSuccess: (fn) => {
      queryClient.setQueryData(serverlessKeys.function(name, scope), fn)
      // The draft is gone and the package digest moved, so the editor's view
      // and every cached file must be re-read against the new deployment.
      void queryClient.invalidateQueries({ queryKey: serverlessKeys.code(name, scope) })
      void queryClient.invalidateQueries({ queryKey: serverlessKeys.versions(name, scope) })
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
