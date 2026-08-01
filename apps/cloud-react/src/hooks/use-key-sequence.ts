import { useEffect } from "react"

import { useLatestRef } from "./use-latest-ref"

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"])

/**
 * Listens for a key sequence (e.g. ["g","d"]) and fires handler.
 * Uses refs so the effect runs exactly once — no stale listener re-registration.
 */
export function useKeySequence(sequence: string[], handler: () => void, timeoutMs = 1000) {
    const handlerRef = useLatestRef(handler)
    const sequenceRef = useLatestRef(sequence)
    const timeoutMsRef = useLatestRef(timeoutMs)

    useEffect(() => {
        const pressed: string[] = []
        let timer: ReturnType<typeof setTimeout> | null = null

        const onKeyDown = (e: KeyboardEvent) => {
            if (
                e.target instanceof Element &&
                (INPUT_TAGS.has(e.target.tagName) || (e.target as HTMLElement).isContentEditable)
            )
                return
            if (e.metaKey || e.ctrlKey || e.altKey) return

            pressed.push(e.key.toLowerCase())
            if (timer) clearTimeout(timer)
            timer = setTimeout(() => {
                pressed.length = 0
            }, timeoutMsRef.current)

            const seq = sequenceRef.current
            const tail = pressed.slice(-seq.length)
            if (tail.length === seq.length && tail.every((k, i) => k === seq[i])) {
                pressed.length = 0
                if (timer) {
                    clearTimeout(timer)
                    timer = null
                }
                handlerRef.current()
            }
        }

        window.addEventListener("keydown", onKeyDown)
        return () => {
            window.removeEventListener("keydown", onKeyDown)
            if (timer) clearTimeout(timer)
        }
    }, [handlerRef, sequenceRef, timeoutMsRef]) // refs are stable — runs once
}
