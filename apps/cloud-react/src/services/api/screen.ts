import { useEffect } from "react"

// Current screen name, sent as X-Screen on every request so the backend can
// attribute traffic to the UI surface that produced it. A screen names itself by
// calling useScreen("…") at the top of its page component; the value is held in
// a tiny module store the request interceptor reads synchronously.
let current = ""

export const screenName = {
  get: () => current,
  set: (name: string) => {
    current = name
  },
}

/**
 * Name the current screen. Call once at the top of a page component:
 *   useScreen("VmDetail")
 * The name is set on mount and sent on every request while this screen is
 * active. It is intentionally not cleared on unmount — the next screen overwrites
 * it on its own mount, so there is never an unnamed gap between screens.
 */
export function useScreen(name: string): void {
  useEffect(() => {
    screenName.set(name)
  }, [name])
}
