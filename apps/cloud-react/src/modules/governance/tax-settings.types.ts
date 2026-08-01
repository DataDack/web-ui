// Tax settings types — mirror the Go TaxRegistration model
// (apps/org/taxsettings). The console only collects India ("IN") today.

export type CustomerType = "business" | "individual"
export type TrnStatus = "pending" | "verified" | "rejected"

/** Legal address block (business legal address). */
export interface TaxLegalAddress {
    line1: string
    line2: string
    city: string
    stateProvince: string
    postalCode: string
    country: string
}

/** One tax registration row (GET responses). */
export interface TaxRegistration {
    id: string
    accountId: string
    accountNumber: string
    accountName: string
    organizationId: string
    country: string
    customerType: CustomerType
    stateProvince: string
    gstin: string
    pan: string
    businessLegalName: string
    legalAddress: TaxLegalAddress | null
    /** TRN surfaced in the table: GSTIN for business, PAN for individual. */
    trn: string
    trnStatus: TrnStatus
    seller: string
    inheritedFromAccount: number | null
}

/** Payload for POST/PUT (mirrors UpsertTaxRegistrationRequest). PAN is only
 * sent for individuals; for business the server derives it from the GSTIN. */
export interface UpsertTaxRegistrationInput {
    country: string
    customerType: CustomerType
    stateProvince?: string
    gstin?: string
    pan?: string
    businessLegalName?: string
    legalAddress: TaxLegalAddress
}

/** Supported jurisdictions. Only India is collected today. */
export const TAX_COUNTRIES = [{ code: "IN", label: "India" }] as const

/** Indian states/UTs for the State/Province selector. */
export const INDIAN_STATES = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Andaman and Nicobar Islands",
    "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Lakshadweep",
    "Puducherry",
] as const
