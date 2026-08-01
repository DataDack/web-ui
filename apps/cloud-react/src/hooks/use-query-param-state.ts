import { useCallback } from "react"

import { useSearchParams } from "react-router-dom"

/**
 * View state that lives in the URL instead of component state — which tab is
 * open, which filter is applied. Putting it in the query string makes the view
 * shareable, survivable across a reload, and restorable with the back button.
 *
 * The stored value is validated against `allowed`, so a hand-typed or stale URL
 * falls back rather than rendering an empty tab. Writes REPLACE the history
 * entry: flipping a tab isn't a navigation, and stacking entries would make Back
 * feel broken. The fallback is deleted rather than written, so the default view
 * keeps a clean URL.
 */
export function useQueryParamState<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): [T, (value: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams()

  const raw = searchParams.get(key)
  const value = allowed.includes(raw as T) ? (raw as T) : fallback

  const setValue = useCallback(
    (next: T) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          if (next === fallback) params.delete(key)
          else params.set(key, next)
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams, key, fallback],
  )

  return [value, setValue]
}
