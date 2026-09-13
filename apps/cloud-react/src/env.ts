export const env = {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL ?? "",
  // VITE_PUBLIC_POSTHOG_PROJECT_TOKEN: import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN ?? "",
  // VITE_PUBLIC_POSTHOG_HOST: import.meta.env.VITE_PUBLIC_POSTHOG_HOST ?? "",
  VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN ?? "",
  VITE_GOOGLE_CLIENT_ID: (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "") as string,
  VITE_MS_CLIENT_ID: (import.meta.env.VITE_MS_CLIENT_ID ?? "") as string,
  VITE_MS_AUTHORITY: (import.meta.env.VITE_MS_AUTHORITY ??
    "https://login.microsoftonline.com/common") as string,
}
