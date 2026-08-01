import { apiDelete, apiGet, apiPost, apiPut } from "@/services/api/client"

import type {
    AccountMember,
    AccountProfile,
    ConvertToBusinessPayload,
    MyAccount,
    PendingTransfer,
    ProvisionAccountPayload,
    ProvisionedAccount,
    TransferOTPSent,
    UpdateAccountPayload,
    UpdateAddressPayload,
} from "./accounts.types"

const BASE = "/org/accounts"

export const accountsApi = {
    /** Accounts the caller can act in — their own + any invited into (the switcher). */
    listMine: () => apiGet<MyAccount[]>(`${BASE}/me`),

    /** Create a standalone account owned by the caller (returns it for switching). */
    provision: (payload: ProvisionAccountPayload) =>
        apiPost<ProvisionedAccount>(`${BASE}/provision`, payload),

    /** Rename and/or change an account's lifecycle status. */
    update: (id: string, payload: UpdateAccountPayload) =>
        apiPut<MyAccount>(`${BASE}/${id}`, payload),

    /** Make this account the caller's home/primary account (the switcher default). */
    setDefault: (id: string) => apiPost<MyAccount>(`${BASE}/${id}/default`),

    /** Members of an account (with their membership role). */
    listMembers: (id: string) => apiGet<AccountMember[]>(`${BASE}/${id}/members`),

    /** The account's contact/verification profile (address + KYC status). */
    getProfile: (id: string) => apiGet<AccountProfile>(`${BASE}/${id}/profile`),

    /** Upsert the account's contact address (owner/admin). */
    updateAddress: (id: string, payload: UpdateAddressPayload) =>
        apiPut<AccountProfile>(`${BASE}/${id}/address`, payload),

    /** Convert an individual account into a business account (owner/admin). */
    convertToBusiness: (id: string, payload: ConvertToBusinessPayload) =>
        apiPost<AccountProfile>(`${BASE}/${id}/convert-to-business`, payload),

    /** Start an ownership transfer — OTP is emailed to the current owner. */
    initiateTransfer: (id: string, targetEmail: string) =>
        apiPost<TransferOTPSent>(`${BASE}/${id}/transfer/initiate`, { target_email: targetEmail }),

    /** Confirm an ownership transfer with the OTP the owner received. */
    confirmTransfer: (id: string, otp: string) =>
        apiPost<null>(`${BASE}/${id}/transfer/confirm`, { otp }),

    /** Whether an ownership transfer is pending — lets the UI resume the code step. */
    pendingTransfer: (id: string) => apiGet<PendingTransfer>(`${BASE}/${id}/transfer/pending`),

    /** Abandon an in-flight ownership transfer, clearing the pending code. */
    cancelTransfer: (id: string) => apiDelete(`${BASE}/${id}/transfer`),
}
