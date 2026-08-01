import { useEffect, useRef } from "react"

import { useQueryClient } from "@tanstack/react-query"

import { subscribeConsoleEvents, type ConsoleBroadcastEvent } from "./console-channel"

/**
 * Run a handler when another tab publishes a console event.
 *
 * The handler is held in a ref so a component can pass an inline closure
 * without resubscribing on every render — the subscription itself is set up
 * once and torn down on unmount.
 */
export function useConsoleBroadcast(onEvent: (event: ConsoleBroadcastEvent) => void): void {
    const handler = useRef(onEvent)

    // Written in an effect, not during render: refs are not render state, and
    // updating one while rendering is the pattern React warns about. The
    // subscription below only ever reads it from a callback, so an update one
    // commit later is exactly as timely as it needs to be.
    useEffect(() => {
        handler.current = onEvent
    }, [onEvent])

    useEffect(
        () =>
            subscribeConsoleEvents((event) => {
                handler.current(event)
            }),
        []
    )
}

/**
 * The console-wide reaction to cross-tab events: refetch what the event made
 * stale, wherever the user happens to be standing.
 *
 * Mounted once in the shell rather than per page, because the tab that needs
 * the news is usually NOT the page that caused it — an upgrade paid for in the
 * billing tab has to reach the Managed Apps settings tab that sent the user
 * there. Query keys are written as plain prefixes to keep the shell free of
 * imports from the modules it is refreshing.
 */
export function useConsoleBroadcastSync(): void {
    const queryClient = useQueryClient()

    useConsoleBroadcast((event) => {
        if (event.type === "billing:credited") {
            void queryClient.invalidateQueries({ queryKey: ["billing"] })
            // A funded wallet is what stands between the user and the upgrade
            // they were refused, so the plan surfaces refetch too.
            void queryClient.invalidateQueries({ queryKey: ["managed-apps", "plans"] })
            return
        }
        void queryClient.invalidateQueries({ queryKey: ["managed-apps"] })
        void queryClient.invalidateQueries({ queryKey: ["quotas"] })
        void queryClient.invalidateQueries({ queryKey: ["billing"] })
    })
}
