import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useActiveRegion } from "@/modules/region/region.context"
import { extractError } from "@/services/api/client"

import { serverlessApi } from "./serverless.api"

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
