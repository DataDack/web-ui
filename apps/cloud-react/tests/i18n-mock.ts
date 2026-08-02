import en from "@/services/language_service/locales/en.json"

/**
 * A `t` that resolves real copy from en.json.
 *
 * Tests used to mock `t` as "return the key", which silently passed only while
 * the components under test held hardcoded English. Once a string moved into the
 * locale file, every query for user-visible text stopped matching — the mock was
 * asserting against key paths, not against what a user reads.
 *
 * Resolving the real bundle keeps those queries meaningful and makes a missing
 * key fail the test, which is the same failure the user would see on screen.
 */
export function translate(key: string, options?: Record<string, unknown>): string {
  const parts = key.split(".")
  let cursor: unknown = en

  for (const part of parts) {
    if (typeof cursor !== "object" || cursor === null || !(part in cursor)) {
      // Fall back the way i18next does, so a genuinely absent key is visible in
      // the assertion rather than throwing here.
      return (options?.defaultValue as string | undefined) ?? key
    }
    cursor = (cursor as Record<string, unknown>)[part]
  }

  if (typeof cursor !== "string") {
    return (options?.defaultValue as string | undefined) ?? key
  }

  // Interpolate {{name}} placeholders from the options bag.
  return cursor.replace(/\{\{(\w+)\}\}/g, (_match, name: string) =>
    name in (options ?? {}) ? String(options?.[name]) : `{{${name}}}`,
  )
}

/** Drop-in replacement for the react-i18next module in a test. */
export const i18nMock = {
  useTranslation: () => ({ t: translate }),
  Trans: ({ children }: { children?: unknown }) => children,
}
