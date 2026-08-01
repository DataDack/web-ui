import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { extractError } from "@/services/api/client"

import { GOVERNANCE_QUERY_KEYS } from "./governance.constants"
import { taxSettingsApi } from "./tax-settings.api"
import type { UpsertTaxRegistrationInput } from "./tax-settings.types"

export function useTaxRegistrations(params?: { status?: string; q?: string }) {
    return useQuery({
        queryKey: [
            ...GOVERNANCE_QUERY_KEYS.taxRegistrations,
            params?.status ?? "",
            params?.q ?? "",
        ],
        queryFn: () => taxSettingsApi.list(params),
    })
}

export function useTaxRegistration(id: string | undefined) {
    return useQuery({
        queryKey: GOVERNANCE_QUERY_KEYS.taxRegistration(id ?? ""),
        queryFn: () => taxSettingsApi.get(id ?? ""),
        enabled: !!id,
    })
}

/** Create or update a registration. Pass an id to edit, omit to create. */
export function useSaveTaxRegistration() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: ({ id, input }: { id?: string; input: UpsertTaxRegistrationInput }) =>
            id ? taxSettingsApi.update(id, input) : taxSettingsApi.create(input),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: GOVERNANCE_QUERY_KEYS.taxRegistrations })
            toast.success(t("taxSettings.toasts.saved"))
        },
        onError: (err) => {
            toast.error(extractError(err, t("taxSettings.toasts.saveFailed")))
        },
    })
}

export function useDeleteTaxRegistration() {
    const queryClient = useQueryClient()
    const { t } = useTranslation()
    return useMutation({
        mutationFn: (id: string) => taxSettingsApi.remove(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: GOVERNANCE_QUERY_KEYS.taxRegistrations })
            toast.success(t("taxSettings.toasts.deleted"))
        },
        onError: (err) => {
            toast.error(extractError(err, t("taxSettings.toasts.deleteFailed")))
        },
    })
}

export function useDownloadTaxCsv() {
    const { t } = useTranslation()
    return useMutation({
        mutationFn: () => taxSettingsApi.downloadCsv(),
        onError: (err) => {
            toast.error(extractError(err, t("taxSettings.toasts.exportFailed")))
        },
    })
}
