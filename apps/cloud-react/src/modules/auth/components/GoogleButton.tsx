import { useEffect, useRef, useState } from "react"

import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { FcGoogle } from "react-icons/fc"
import { toast } from "sonner"

import { env } from "@/env"
import { cn } from "@/lib/utils"
import { useTheme } from "@/services/theme_service"

interface CredentialResponse {
    credential?: string
}

interface GsiButtonConfig {
    type: "standard" | "icon"
    theme?: "outline" | "filled_blue" | "filled_black"
    size?: "large" | "medium" | "small"
    text?: "signin_with" | "signup_with" | "continue_with" | "signin"
    shape?: "rectangular" | "pill" | "circle" | "square"
    logo_alignment?: "left" | "center"
    width?: number
}

interface GoogleID {
    initialize: (config: {
        client_id: string
        callback: (res: CredentialResponse) => void
        use_fedcm_for_button?: boolean
    }) => void
    renderButton: (parent: HTMLElement, config: GsiButtonConfig) => void
}

declare global {
    interface Window {
        google?: { accounts?: { id?: GoogleID } }
    }
}

const GSI_SRC = "https://accounts.google.com/gsi/client"

// Google's rendered button maxes out at 400px wide and needs a pixel value.
const MIN_WIDTH = 200
const MAX_WIDTH = 400

function loadGsi(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (window.google?.accounts?.id) {
            resolve()
            return
        }
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`)
        if (existing) {
            existing.addEventListener("load", () => { resolve(); })
            existing.addEventListener("error", () => { reject(new Error("gsi load failed")); })
            return
        }
        const script = document.createElement("script")
        script.src = GSI_SRC
        script.async = true
        script.defer = true
        script.onload = () => { resolve(); }
        script.onerror = () => { reject(new Error("gsi load failed")); }
        document.head.appendChild(script)
    })
}

const pill =
    "console-card flex h-12 w-full items-center justify-center gap-3 rounded-full border border-border bg-card px-5 text-sm font-medium text-foreground outline-none transition-all duration-200 disabled:opacity-50"

/**
 * "Continue with Google" — renders Google's own sign-in button (the FedCM button
 * flow) and hands the resulting OIDC ID token to the parent for server-side
 * validation.
 *
 * Deliberately NOT `google.accounts.id.prompt()`: that is One Tap, a *passive*
 * prompt that only appears when the user already has a Google session, is
 * suppressed by an escalating cooldown after each dismissal, and never shows at
 * all when third-party sign-in is disabled. Worse, FedCM no longer emits the
 * display-moment notification (`isNotDisplayed()` is unsupported and
 * `use_fedcm_for_prompt` is ignored), so there is no callback to recover from
 * "it didn't display" — a click would just hang. `renderButton` is the supported
 * click-triggered flow: it always opens an account chooser and has no cooldown.
 */
export function GoogleButton({
    onToken,
    disabled = false,
}: Readonly<{ onToken: (idToken: string) => void; disabled?: boolean }>) {
    const { t } = useTranslation()
    const { resolvedTheme } = useTheme()
    const clientId = env.VITE_GOOGLE_CLIENT_ID

    const hostRef = useRef<HTMLDivElement>(null)
    const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading")
    const [width, setWidth] = useState(0)

    // Keep the newest callback reachable without re-initializing GSI each render.
    const onTokenRef = useRef(onToken)
    useEffect(() => {
        onTokenRef.current = onToken
    }, [onToken])

    // Google needs an explicit pixel width, so track the container's own width
    // and re-render the button when it changes.
    useEffect(() => {
        const host = hostRef.current
        if (!host) return
        const measure = () => {
            const next = Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, host.clientWidth)))
            setWidth((prev) => (prev === next ? prev : next))
        }
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(host)
        return () => { observer.disconnect(); }
    }, [])

    useEffect(() => {
        const host = hostRef.current
        if (!clientId || !width || !host) return
        let cancelled = false

        const render = async () => {
            try {
                await loadGsi()
                if (cancelled) return
                const googleID = window.google?.accounts?.id
                if (!googleID) {
                    setStatus("failed")
                    return
                }
                googleID.initialize({
                    client_id: clientId,
                    use_fedcm_for_button: true,
                    callback: (res) => {
                        if (res.credential) onTokenRef.current(res.credential)
                        else toast.error(t("auth.errors.googleFailed"))
                    },
                })
                // Re-rendering (theme/width change) must not stack buttons.
                host.replaceChildren()
                googleID.renderButton(host, {
                    type: "standard",
                    theme: resolvedTheme === "dark" ? "filled_black" : "outline",
                    size: "large",
                    text: "continue_with",
                    shape: "pill",
                    logo_alignment: "center",
                    width,
                })
                setStatus("ready")
            } catch {
                if (!cancelled) setStatus("failed")
            }
        }
        void render()

        return () => { cancelled = true; }
    }, [clientId, width, resolvedTheme, t])

    if (!clientId) {
        return (
            <button
                type="button"
                disabled
                title={t("auth.google.unconfigured")}
                className={cn(pill, "text-muted-foreground")}
            >
                <FcGoogle className="size-5" />
                {t("auth.google.continue")}
            </button>
        )
    }

    if (status === "failed") {
        return (
            <button
                type="button"
                disabled
                title={t("auth.errors.googleFailed")}
                className={cn(pill, "text-muted-foreground")}
            >
                <FcGoogle className="size-5" />
                {t("auth.google.continue")}
            </button>
        )
    }

    return (
        <div
            className={cn(
                // Matches the height of the sibling provider pills so the stack
                // keeps its rhythm; Google's button sits centered inside.
                "flex h-12 w-full items-center justify-center",
                // Google's button cannot be disabled programmatically, so gate
                // interaction from the outside.
                disabled && "pointer-events-none opacity-50"
            )}
        >
            <div ref={hostRef} className="flex w-full items-center justify-center" />
            {status === "loading" && (
                <span className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    {t("auth.google.continue")}
                </span>
            )}
        </div>
    )
}
