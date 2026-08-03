import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useServerlessContext } from "./transport"
import type {
  ArtifactRef,
  CreateFromPackageInput,
  CreateFromSourceInput,
  CreatedFunction,
  RuntimeInfo,
} from "./types"

/**
 * Query keys for the shared serverless data.
 *
 * Scoped by a caller-supplied `scope` string so a console that partitions its
 * cache — cloud-react keys everything by active region — does not serve one
 * region's catalog for another. Consoles with a single control plane pass
 * nothing and get a stable key.
 */
export const serverlessKeys = {
  runtimes: (scope = "default") => ["datadack-serverless", "runtimes", scope] as const,
  functions: (scope = "default") => ["datadack-serverless", "functions", scope] as const,
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
