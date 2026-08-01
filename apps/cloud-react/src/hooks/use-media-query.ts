import { useCallback, useSyncExternalStore } from "react"

/**
 * Subscribes to a CSS media query.
 *
 * Exists for controls that need a genuinely different shell per viewport rather
 * than different CSS — a popover anchored to a narrow trigger has nowhere to go
 * on a phone, so it becomes a bottom sheet instead.
 *
 * Built on `useSyncExternalStore` rather than an effect: `matchMedia` is an
 * external store, and reading it through the store API keeps the first render
 * correct without a setState-in-effect cascade.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener("change", onStoreChange)
      return () => {
        list.removeEventListener("change", onStoreChange)
      }
    },
    [query],
  )

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])

  return useSyncExternalStore(subscribe, getSnapshot)
}
