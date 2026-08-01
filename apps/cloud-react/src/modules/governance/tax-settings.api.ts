import { api, apiDelete, apiGet, apiPost, apiPut } from "@/services/api/client"

import type {
  CustomerType,
  TaxLegalAddress,
  TaxRegistration,
  TrnStatus,
  UpsertTaxRegistrationInput,
} from "./tax-settings.types"

const BASE = "/org/tax-settings/registrations"

/** Raw address as returned by the Go LegalAddress (snake_case). */
interface AddressEntity {
  line1?: string
  line2?: string
  city?: string
  state_province?: string
  postal_code?: string
  country?: string
}

/** Raw registration as returned by the Go TaxRegistrationResponse. */
interface RegistrationEntity {
  id: string
  account_id: string
  account_number?: string
  account_name?: string
  organization_id: string
  country: string
  customer_type: CustomerType
  state_province?: string
  gstin?: string
  pan?: string
  business_legal_name?: string
  legal_address?: AddressEntity | null
  trn?: string
  trn_status?: TrnStatus
  seller?: string
  inherited_from_account?: number | null
}

function toAddress(a?: AddressEntity | null): TaxLegalAddress | null {
  if (!a) return null
  return {
    line1: a.line1 ?? "",
    line2: a.line2 ?? "",
    city: a.city ?? "",
    stateProvince: a.state_province ?? "",
    postalCode: a.postal_code ?? "",
    country: a.country ?? "",
  }
}

function toRegistration(e: RegistrationEntity): TaxRegistration {
  return {
    id: e.id,
    accountId: e.account_id,
    accountNumber: e.account_number ?? "",
    accountName: e.account_name ?? "",
    organizationId: e.organization_id,
    country: e.country,
    customerType: e.customer_type,
    stateProvince: e.state_province ?? "",
    gstin: e.gstin ?? "",
    pan: e.pan ?? "",
    businessLegalName: e.business_legal_name ?? "",
    legalAddress: toAddress(e.legal_address),
    trn: e.trn ?? "",
    trnStatus: e.trn_status ?? "pending",
    seller: e.seller ?? "",
    inheritedFromAccount: e.inherited_from_account ?? null,
  }
}

/** Build the snake_case upsert body the backend expects. */
function toPayload(input: UpsertTaxRegistrationInput) {
  return {
    country: input.country,
    customer_type: input.customerType,
    state_province: input.stateProvince ?? "",
    gstin: input.gstin ?? "",
    pan: input.pan ?? "",
    business_legal_name: input.businessLegalName ?? "",
    legal_address: {
      line1: input.legalAddress.line1,
      line2: input.legalAddress.line2,
      city: input.legalAddress.city,
      state_province: input.legalAddress.stateProvince,
      postal_code: input.legalAddress.postalCode,
      country: input.legalAddress.country,
    },
  }
}

export const taxSettingsApi = {
  list: async (params?: { status?: string; q?: string }): Promise<TaxRegistration[]> => {
    const qs = new URLSearchParams({ page: "1", limit: "100" })
    if (params?.status) qs.set("status", params.status)
    if (params?.q) qs.set("q", params.q)
    const res = await apiGet<RegistrationEntity[]>(`${BASE}?${qs.toString()}`)
    return res.map(toRegistration)
  },

  get: async (id: string): Promise<TaxRegistration> => {
    const res = await apiGet<RegistrationEntity>(`${BASE}/${id}`)
    return toRegistration(res)
  },

  create: async (input: UpsertTaxRegistrationInput): Promise<TaxRegistration> => {
    const res = await apiPost<RegistrationEntity>(BASE, toPayload(input))
    return toRegistration(res)
  },

  update: async (id: string, input: UpsertTaxRegistrationInput): Promise<TaxRegistration> => {
    const res = await apiPut<RegistrationEntity>(`${BASE}/${id}`, toPayload(input))
    return toRegistration(res)
  },

  remove: (id: string): Promise<void> => apiDelete(`${BASE}/${id}`),

  /** Download all registrations as CSV. The export endpoint streams raw CSV
   * (not the JSON envelope), so it bypasses the apiGet helper. */
  downloadCsv: async (): Promise<void> => {
    const res = await api.get(`${BASE}/export`, { responseType: "blob" })
    const url = URL.createObjectURL(res.data as Blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "tax-registrations.csv"
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}
