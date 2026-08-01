import { useEffect, useRef } from "react"

/**
 * Returns a ref that always holds the latest value, synced after every render.
 * Lets effects/listeners read fresh values without re-registering on change.
 */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  })
  return ref
}
