import { api, apiDelete, apiGet, apiPost, type ApiMeta } from "@/services/api/client"

import type {
  Certificate,
  CertificateList,
  CertificateListParams,
  CertificateSummary,
  ImportCertificateRequest,
  ImportCertificateResult,
} from "./certificates.types"

// cloud-be-go: app "domains", module "certificates" -> base /domains/certificates.
//
// There is deliberately no call here that returns a private key, because there is
// no route that can: the chain download serves the public chain only.
const BASE = "/domains/certificates"

type ListMeta = ApiMeta & { total?: number }

function buildQuery(params: CertificateListParams): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    query.set(key, String(value))
  }
  return query.toString()
}

export const certificatesApi = {
  list: async (params: CertificateListParams): Promise<CertificateList> => {
    // Raw axios, not apiGet: apiGet drops meta, and the pager needs meta.total.
    const res = await api.get<{ data: Certificate[] | null; meta: ListMeta }>(
      `${BASE}/?${buildQuery(params)}`,
    )
    const rows = res.data.data ?? []
    return { rows, total: res.data.meta.total ?? rows.length }
  },

  summary: (): Promise<CertificateSummary> => apiGet<CertificateSummary>(`${BASE}/summary`),

  get: (id: string): Promise<Certificate> =>
    apiGet<Certificate>(`${BASE}/${encodeURIComponent(id)}`),

  /**
   * Upload a certificate the tenant already has. Refusals come back as 400s
   * written to be read as-is: key mismatch, expired, encrypted key, a name this
   * account has not connected, a DataDack hostname.
   */
  import: (body: ImportCertificateRequest): Promise<ImportCertificateResult> =>
    apiPost<ImportCertificateResult>(`${BASE}/`, body),

  /** Ask the platform to obtain one for a connected, verified hostname. */
  request: (hostname: string): Promise<Certificate> =>
    apiPost<Certificate>(`${BASE}/request`, { hostname }),

  renew: (id: string): Promise<void> => apiPost(`${BASE}/${encodeURIComponent(id)}/renew`),

  /** Imported certificates only. The platform issues its own for the names afterwards. */
  remove: (id: string): Promise<void> => apiDelete(`${BASE}/${encodeURIComponent(id)}`),

  /** Re-read the certificate store now instead of waiting for the background pass. */
  refresh: (): Promise<void> => apiPost(`${BASE}/refresh`),

  /** The public chain as a PEM file. */
  downloadChain: async (cert: Certificate): Promise<void> => {
    const res = await api.get<Blob>(`${BASE}/${encodeURIComponent(cert.id)}/chain`, {
      responseType: "blob",
    })
    const url = URL.createObjectURL(res.data)
    const link = document.createElement("a")
    link.href = url
    link.download = `${cert.subject.replace("*", "wildcard")}.pem`
    link.click()
    URL.revokeObjectURL(url)
  },
}
