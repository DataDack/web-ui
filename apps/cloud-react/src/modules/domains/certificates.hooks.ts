import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { extractError } from "@/services/api/client"

import { certificatesApi } from "./certificates.api"
import type {
  Certificate,
  CertificateListParams,
  ImportCertificateRequest,
} from "./certificates.types"

export const CERTIFICATES_PAGE_SIZE = 25

export const CERTIFICATES_QUERY_KEYS = {
  all: ["certificates"] as const,
  list: (params: CertificateListParams) => ["certificates", "list", params] as const,
  summary: ["certificates", "summary"] as const,
  detail: (id: string) => ["certificates", "detail", id] as const,
}

/** A request waiting on the CA resolves on its own; poll fast while one exists. */
const hasPending = (rows: Certificate[] | undefined) =>
  rows?.some((cert) => cert.status === "pending_validation") ?? false

export function useCertificates(params: CertificateListParams) {
  return useQuery({
    queryKey: CERTIFICATES_QUERY_KEYS.list(params),
    queryFn: () => certificatesApi.list(params),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => (hasPending(query.state.data?.rows) ? 10_000 : 60_000),
  })
}

export function useCertificateSummary() {
  return useQuery({
    queryKey: CERTIFICATES_QUERY_KEYS.summary,
    queryFn: certificatesApi.summary,
    refetchInterval: 60_000,
  })
}

export function useCertificate(id: string) {
  return useQuery({
    queryKey: CERTIFICATES_QUERY_KEYS.detail(id),
    queryFn: () => certificatesApi.get(id),
    enabled: id !== "",
    refetchInterval: (query) =>
      query.state.data?.status === "pending_validation" ? 10_000 : false,
  })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => void queryClient.invalidateQueries({ queryKey: CERTIFICATES_QUERY_KEYS.all })
}

/** Errors stay on the mutation: the import dialog renders the server's sentence inline. */
export function useImportCertificate() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body: ImportCertificateRequest) => certificatesApi.import(body),
    onSuccess: invalidate,
  })
}

export function useRequestCertificate() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (hostname: string) => certificatesApi.request(hostname),
    onSuccess: invalidate,
  })
}

export function useRenewCertificate() {
  const { t } = useTranslation()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (cert: Certificate) => certificatesApi.renew(cert.id),
    onSuccess: (_data, cert) => {
      invalidate()
      toast.success(t("domains.certificates.actions.renewStarted", { subject: cert.subject }))
    },
    onError: (e) => toast.error(extractError(e, t("domains.certificates.actions.renewFailed"))),
  })
}

export function useRemoveCertificate() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (cert: Certificate) => certificatesApi.remove(cert.id),
    onSuccess: (_data, cert) => {
      queryClient.removeQueries({ queryKey: CERTIFICATES_QUERY_KEYS.detail(cert.id) })
      void queryClient.invalidateQueries({ queryKey: CERTIFICATES_QUERY_KEYS.all })
      toast.success(t("domains.certificates.actions.removed", { subject: cert.subject }))
    },
    onError: (e) => toast.error(extractError(e, t("domains.certificates.actions.removeFailed"))),
  })
}

export function useRefreshCertificates() {
  const { t } = useTranslation()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: certificatesApi.refresh,
    onSuccess: invalidate,
    onError: (e) => toast.error(extractError(e, t("domains.certificates.refreshFailed"))),
  })
}

export function useDownloadChain() {
  const { t } = useTranslation()
  return useMutation({
    mutationFn: (cert: Certificate) => certificatesApi.downloadChain(cert),
    onError: (e) => toast.error(extractError(e, t("domains.certificates.actions.downloadFailed"))),
  })
}
