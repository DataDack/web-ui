import { useQuery } from "@tanstack/react-query"

import { apiGet } from "@/services/api/client"

import type { CountriesResponse, Country } from "./countries.types"

export const COUNTRIES_QUERY_KEYS = {
    list: ["countries", "list"] as const,
}

// The dataset only changes when borders move; the backend serves it with a
// day-long Cache-Control, so mirror that staleness on the client.
const STALE = 24 * 60 * 60 * 1000

export function useCountries() {
    return useQuery({
        queryKey: COUNTRIES_QUERY_KEYS.list,
        queryFn: () => apiGet<CountriesResponse>("/countries").then((r) => r.countries),
        staleTime: STALE,
    })
}

export type { Country }
