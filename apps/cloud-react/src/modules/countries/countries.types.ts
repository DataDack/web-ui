// Mirrors the cloud-be-go `GET /api/v1/countries` payload. Phone/postal
// patterns are anchored ECMAScript regex strings the client can compile with
// `new RegExp(...)`; they match the national significant number (no dial code).
export interface Country {
  name: string
  iso2: string
  currency_code: string
  currency_symbol: string
  dial_code: string
  flag: string
  nsn_lengths: number[]
  phone_pattern?: string
  postal_pattern?: string
}

export interface CountriesResponse {
  countries: Country[]
}
