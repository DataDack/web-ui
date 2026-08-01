import { useState } from "react"

import { PublicClientApplication } from "@azure/msal-browser"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { env } from "@/env"
import { cn } from "@/lib/utils"

import { MicrosoftIcon } from "./MicrosoftIcon"

// Lazily created singleton MSAL instance (initialize() must run once).
let pcaPromise: Promise<PublicClientApplication> | null = null
function getPca(clientId: string, authority: string): Promise<PublicClientApplication> {
    if (!pcaPromise) {
        const pca = new PublicClientApplication({
            auth: { clientId, authority, redirectUri: window.location.origin },
            cache: { cacheLocation: "sessionStorage" },
        })
        pcaPromise = pca.initialize().then(() => pca)
    }
    return pcaPromise
}

/**
 * "Continue with Microsoft" — runs the MSAL popup, acquires an OIDC ID token,
 * and hands it to the parent. Degrades to a disabled branded button
 * when no client id is configured.
 */
export function MicrosoftButton({
    onToken,
    disabled = false,
}: Readonly<{ onToken: (idToken: string) => void; disabled?: boolean }>) {
    const { t } = useTranslation()
    const [loading, setLoading] = useState(false)
    const clientId = env.VITE_MS_CLIENT_ID

    const pill =
        "console-card flex h-12 w-full items-center justify-center gap-3 rounded-full border border-border bg-card px-5 text-sm font-medium text-foreground outline-none transition-all duration-200 hover:border-brand-gold/60 hover:bg-brand-gold-soft focus-visible:ring-2 focus-visible:ring-brand-gold/40 disabled:opacity-50"

    if (!clientId) {
        return (
            <button type="button" disabled title={t("auth.microsoft.unconfigured")} className={pill}>
                <MicrosoftIcon className="size-5" />
                {t("auth.microsoft.continue")}
            </button>
        )
    }

    const onClick = async () => {
        setLoading(true)
        try {
            const pca = await getPca(clientId, env.VITE_MS_AUTHORITY)
            const res = await pca.loginPopup({ scopes: ["openid", "profile", "email"] })
            if (res.idToken) onToken(res.idToken)
        } catch (e) {
            // Swallow user-cancelled popups; surface real failures.
            const msg = e instanceof Error ? e.message : ""
            if (!/user_cancelled|popup_window_error|interaction_in_progress/i.test(msg)) {
                toast.error(t("auth.errors.microsoftFailed"))
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            type="button"
            disabled={disabled || loading}
            onClick={() => void onClick()}
            className={cn(pill)}
        >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <MicrosoftIcon className="size-5" />}
            {t("auth.microsoft.continue")}
        </button>
    )
}
