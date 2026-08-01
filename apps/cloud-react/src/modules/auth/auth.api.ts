import { api, apiGet, apiPost, apiPut } from "@/services/api/client"

import type {
  AuthTokenResponse,
  LoginOtpSentResponse,
  LoginRequest,
  OAuthPreview,
  OAuthProvider,
  OAuthTokenResponse,
  RegisterRequest,
  UserProfile,
} from "./auth.types"

export const authApi = {
  login: (payload: LoginRequest) => apiPost<AuthTokenResponse>("/auth/users/login", payload),
  register: (payload: RegisterRequest) =>
    apiPost<AuthTokenResponse>("/auth/users/register", payload),
  // Verify an OIDC ID token and preview the account it would create — no signup.
  oauthPreview: (provider: OAuthProvider, idToken: string) =>
    apiPost<OAuthPreview>(`/auth/users/oauth/${provider}/preview`, {
      id_token: idToken,
    }),
  // acceptPolicies records Privacy Policy + Terms consent when the sign-in
  // creates a new account (the signup path); ignored for returning users.
  // phone is the signup mobile number — the API REQUIRES it to create a new
  // account (the provider profile carries no number) and ignores it for a
  // returning user, so it is collected in the confirmation step.
  oauthSignIn: (provider: OAuthProvider, idToken: string, acceptPolicies = false, phone = "") =>
    apiPost<AuthTokenResponse>(`/auth/users/oauth/${provider}/sign-in`, {
      id_token: idToken,
      accept_policies: acceptPolicies,
      phone,
    }),
  // OAuth-style refresh-token grant. The refresh token is stored in IndexedDB,
  // then sent as application/x-www-form-urlencoded refresh_token.
  refresh: (refreshToken: string) => {
    const body = new URLSearchParams()
    body.set("grant_type", "refresh_token")
    body.set("refresh_token", refreshToken)
    return api
      .post<OAuthTokenResponse>("/auth/users/token", body, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
      .then((res) => res.data)
  },
  // Passwordless email login: request a one-time code, then exchange it for tokens.
  // Backend route is /otp/request (see apps/auth/users/users_module.go).
  sendLoginOTP: (email: string) =>
    apiPost<LoginOtpSentResponse>("/auth/users/otp/request", { email }),
  // `phone` is required by the backend only when the verify CREATES an account
  // (new email): it validates the OTP first and, on a correct code, answers
  // 400 "mobile number is required to sign up" WITHOUT consuming the code —
  // so the same email + code can be resubmitted with the phone attached.
  verifyLoginOTP: (email: string, otp: string, acceptPolicies = false, phone?: string) =>
    apiPost<AuthTokenResponse>("/auth/users/otp/verify", {
      email,
      otp,
      accept_policies: acceptPolicies,
      ...(phone ? { phone } : {}),
    }),
  session: () => apiGet<UserProfile>("/auth/users/session?include=accounts,organizations"),
  // Sign out: server revokes outstanding refresh sessions; client clears IndexedDB.
  logout: () => apiPost<null>("/auth/users/logout"),
  // Self profile update (e.g. set the display name right after OTP signup).
  updateProfile: (name: string) => apiPut<UserProfile>("/auth/users/me", { name }),
  // Self mobile-number update — backs the "add your mobile number" prompt shown
  // to legacy users who have none on file.
  updatePhone: (phone: string) => apiPut<UserProfile>("/auth/users/me/phone", { phone }),
}
