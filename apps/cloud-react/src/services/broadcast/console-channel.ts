/**
 * Cross-tab console events.
 *
 * Some of the console's work finishes in a DIFFERENT tab from the one that
 * started it: paying for an upgrade opens the billing page in a new tab, and
 * the tab left behind has no way to learn that the wallet was funded — it would
 * sit on a stale balance until the user reloaded it by hand.
 *
 * A BroadcastChannel is the whole mechanism: one named channel per origin,
 * messages delivered to every other tab of the same app, no server involved.
 * Events are facts about what happened ("credits were added"), never commands —
 * each tab decides for itself what to refetch, so a message from an older build
 * can never drive a newer one into a state it does not have.
 */

export type ConsoleBroadcastEvent =
    /** The wallet was funded (gateway return, or a top-up settled). */
    | { type: "billing:credited" }
    /** The account moved to another Managed Apps tier. */
    | { type: "managed-apps:plan-changed"; code: string }

const CHANNEL_NAME = "datadack-console"

/**
 * Whether the browser supports the channel at all.
 *
 * Everything here degrades to a no-op rather than throwing: the events are an
 * enhancement — every subscriber also refetches on its own — so a browser
 * without BroadcastChannel (or a test environment without one) simply keeps the
 * behaviour the console had before.
 */
function channel(): BroadcastChannel | null {
    if (typeof BroadcastChannel === "undefined") return null
    try {
        return new BroadcastChannel(CHANNEL_NAME)
    } catch {
        return null
    }
}

/** Tell every other tab that something happened. */
export function publishConsoleEvent(event: ConsoleBroadcastEvent): void {
    const bus = channel()
    if (!bus) return
    try {
        bus.postMessage(event)
    } finally {
        // One channel per message: holding a long-lived publisher open would
        // keep a port alive in every tab that has ever published.
        bus.close()
    }
}

/**
 * Listen for events from other tabs. Returns the unsubscribe function.
 *
 * The payload is validated before it is handed on — it arrives from another
 * document and is `unknown` as far as this tab is concerned.
 */
export function subscribeConsoleEvents(
    onEvent: (event: ConsoleBroadcastEvent) => void
): () => void {
    const bus = channel()
    if (!bus) return () => undefined

    const handler = (message: MessageEvent<unknown>) => {
        const data = message.data
        if (typeof data !== "object" || data === null || !("type" in data)) return
        const { type } = data
        if (type === "billing:credited") {
            onEvent({ type: "billing:credited" })
            return
        }
        if (type === "managed-apps:plan-changed") {
            const code = (data as { code?: unknown }).code
            onEvent({ type, code: typeof code === "string" ? code : "" })
        }
    }

    bus.addEventListener("message", handler)
    return () => {
        bus.removeEventListener("message", handler)
        bus.close()
    }
}
