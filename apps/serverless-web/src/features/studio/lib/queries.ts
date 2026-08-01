import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { http } from '@/lib/api'

import {
  codeFileSchema,
  codeTreeSchema,
  functionListSchema,
  runtimeListSchema,
  type CodeEntry,
  type CodeFile,
  type CodeTree,
  type FunctionSummary,
  type Runtime,
} from './schemas'

const keys = {
  runtimes: ['fs', 'runtimes'] as const,
  functions: ['fs', 'functions'] as const,
  code: (fn: string) => ['fs', 'code', fn] as const,
  file: (fn: string, path: string) => ['fs', 'code', fn, 'file', path] as const,
}

const codePath = (fn: string) => `/v1/functions/${encodeURIComponent(fn)}/code`

/** The runtime catalog. Served by the control plane, so it never goes stale. */
export function useRuntimes() {
  return useQuery({
    queryKey: keys.runtimes,
    queryFn: async (): Promise<Runtime[]> => {
      const { data } = await http.get<unknown>('/v1/runtimes')
      return runtimeListSchema.parse(data).runtimes
    },
    // The catalog only changes on a control-plane release.
    staleTime: 5 * 60 * 1000,
  })
}

export function useFunctions() {
  return useQuery({
    queryKey: keys.functions,
    queryFn: async (): Promise<FunctionSummary[]> => {
      const { data } = await http.get<unknown>('/v1/functions')
      return functionListSchema.parse(data).functions
    },
    refetchInterval: 5000,
  })
}

export function useCodeTree(functionName: string) {
  return useQuery({
    queryKey: keys.code(functionName),
    queryFn: async (): Promise<CodeTree> => {
      const { data } = await http.get<unknown>(codePath(functionName))
      return codeTreeSchema.parse(data)
    },
    enabled: Boolean(functionName),
  })
}

export function useCodeFile(functionName: string, path: string) {
  return useQuery({
    queryKey: keys.file(functionName, path),
    queryFn: async (): Promise<CodeFile> => {
      const { data } = await http.get<unknown>(
        `${codePath(functionName)}/file?path=${encodeURIComponent(path)}`,
      )
      return codeFileSchema.parse(data)
    },
    enabled: Boolean(functionName && path),
    // Contents are edited locally; refetching would clobber unsaved buffers.
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
  })
}

export interface CreateFunctionInput {
  name: string
  runtime: string
  handler: string
  architecture?: string
  memorySize?: number
  timeout?: number
  env?: Record<string, string>
  files: { path: string; content: string }[]
}

export function useCreateFunction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateFunctionInput) => {
      const { data } = await http.post<unknown>('/v1/functions/source', input)
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.functions })
    },
  })
}

/**
 * Direct deploy through POST /v1/functions — the packaged paths the source
 * route cannot express: a pre-built container image, or a local process
 * (`fprocess`) command that runs with no artifact at all.
 */
export interface DeployFunctionInput {
  name: string
  image: string
  fprocess?: string
  memorySize?: number
  timeout?: number
  env?: Record<string, string>
}

export function useDeployFunction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: DeployFunctionInput) => {
      const { data } = await http.post<unknown>('/v1/functions', input)
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.functions })
    },
  })
}

export function useSaveCodeFile(functionName: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ path, content }: { path: string; content: string }) => {
      const { data } = await http.put<unknown>(
        `${codePath(functionName)}/file?path=${encodeURIComponent(path)}`,
        { content },
      )
      return codeTreeSchema.parse(data)
    },
    onSuccess: (tree) => {
      queryClient.setQueryData(keys.code(functionName), tree)
    },
  })
}

export function useDeployDraft(functionName: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (baseSha256?: string) => {
      const { data } = await http.post<unknown>(`${codePath(functionName)}/deploy`, {
        baseSha256: baseSha256 ?? '',
      })
      return data as { version?: { version?: string } }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.code(functionName) })
      void queryClient.invalidateQueries({ queryKey: keys.functions })
    },
  })
}

export function useDiscardDraft(functionName: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await http.post<unknown>(`${codePath(functionName)}/discard`)
      return codeTreeSchema.parse(data)
    },
    onSuccess: (tree) => {
      queryClient.setQueryData(keys.code(functionName), tree)
      void queryClient.invalidateQueries({ queryKey: ['fs', 'code', functionName, 'file'] })
    },
  })
}

/**
 * Every text file's content, for mounting the package into a virtual workspace.
 *
 * The tree lists paths but not contents, and the workbench needs the whole set
 * up front — an explorer showing files it cannot open is worse than none.
 * Binary entries are skipped: they cannot be edited anyway.
 */
export function useCodeSources(functionName: string, files: CodeEntry[]) {
  const paths = files.filter((entry) => !entry.binary).map((entry) => entry.path)

  return useQuery({
    queryKey: ['fs', 'code', functionName, 'sources', paths.join(' ')],
    queryFn: async (): Promise<{ path: string; content: string }[]> =>
      Promise.all(
        paths.map(async (path) => {
          const { data } = await http.get<unknown>(
            `${codePath(functionName)}/file?path=${encodeURIComponent(path)}`,
          )
          return { path, content: codeFileSchema.parse(data).content }
        }),
      ),
    enabled: Boolean(functionName) && paths.length > 0,
    // Contents are edited in the workbench; refetching would clobber the
    // in-memory workspace underneath the user.
    staleTime: Infinity,
  })
}
