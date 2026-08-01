import { useEffect } from "react"

import { useLatestRef } from "./use-latest-ref"

type Modifier = "cmd" | "ctrl" | "shift" | "none"

function isModifierPressed(e: KeyboardEvent, modifier: Modifier): boolean {
  if (modifier === "cmd") return e.metaKey || e.ctrlKey
  if (modifier === "ctrl") return e.ctrlKey
  if (modifier === "shift") return e.shiftKey
  return true
}

/**
 * Registers a single-key shortcut (with optional modifier).
 * Uses a ref for handler so re-renders don't reinstall the listener.
 */
export function useKeyboardShortcut(key: string, handler: () => void, modifier: Modifier = "cmd") {
  const handlerRef = useLatestRef(handler)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isModifierPressed(e, modifier) && e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault()
        handlerRef.current()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [key, modifier, handlerRef]) // key and modifier are primitives — stable
}
