import { useEffect, useRef, useState } from "react"

import { Button } from "@datadack/common-ui"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { extractError } from "@/services/api/client"
import { useScreen } from "@/services/api/screen"

import { MANAGED_APPS_ROUTES } from "../../managed-apps.constants"
import { useGitHubCallback, useGitHubInstallUrl } from "../../managed-apps.hooks"

type Phase = "working" | "done" | "error"

/**
 * Landing route for the GitHub App post-install redirect
 * (/managed-apps/github/callback?installation_id=&setup_action=&state=). It
 * posts the params to the backend, which verifies the state and stores the
 * connection, then offers to continue into the deploy wizard. The exchange runs
 * exactly once (StrictMode-safe).
 */
export function GitHubCallbackPage() {
  useScreen("managed-apps-github-callback")
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { mutate: completeCallback } = useGitHubCallback()
  const { mutate: fetchInstallUrl, isPending: isRetrying } = useGitHubInstallUrl()

  const installationIdRaw = params.get("installation_id")
  const setupAction = params.get("setup_action") ?? ""
  const state = params.get("state")
  // The OAuth code proving the signed-in GitHub user owns the installation.
  // Relayed as-is; the backend decides whether its absence is acceptable
  // (it is only in dev setups without OAuth credentials configured).
  const code = params.get("code") ?? ""

  // The backend wants installation_id as a number — reject anything that
  // doesn't parse instead of posting NaN.
  const installationId = installationIdRaw ? Number(installationIdRaw) : Number.NaN

  // Derive the initial state from the URL up front so we never call setState
  // synchronously inside the effect — only the async exchange resolves later.
  const invalid = !state || !Number.isFinite(installationId)
  const [phase, setPhase] = useState<Phase>(invalid ? "error" : "working")
  const [message, setMessage] = useState<string>(() => {
    if (!Number.isFinite(installationId)) {
      return "Missing installation details — please try connecting again."
    }
    if (!state) {
      return "Missing or expired state — please try connecting again."
    }
    return "Finishing the GitHub App installation…"
  })

  const ranRef = useRef(false)

  useEffect(() => {
    // The checks also narrow state to string for the call below.
    if (ranRef.current || !state || !Number.isFinite(installationId)) return
    ranRef.current = true

    completeCallback(
      { installation_id: installationId, setup_action: setupAction, state, code },
      {
        onSuccess: (connection) => {
          const login = connection.github_login
          setPhase("done")
          setMessage(
            login
              ? `Connected to ${login} — you can close this page or continue deploying.`
              : "GitHub connected — you can close this page or continue deploying.",
          )
          toast.success("GitHub connected")
        },
        onError: (e) => {
          setPhase("error")
          setMessage(
            extractError(
              e,
              "Could not complete the GitHub connection — the link may be invalid or expired.",
            ),
          )
        },
      },
    )
  }, [installationId, setupAction, state, code, completeCallback])

  // An expired/invalid state can't be replayed — start a fresh install instead.
  const retryInstall = () => {
    fetchInstallUrl(undefined, {
      onSuccess: ({ url }) => {
        window.location.assign(url)
      },
    })
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 text-center">
      {phase === "working" && <Loader2 className="size-8 animate-spin text-muted-foreground" />}
      {phase === "done" && <CheckCircle2 className="size-8 text-emerald-500" />}
      {phase === "error" && <XCircle className="size-8 text-destructive" />}

      <div className="space-y-1">
        <h1 className="text-lg font-semibold">
          {phase === "error" ? "GitHub connection failed" : "Connect GitHub"}
        </h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>

      {phase === "done" && (
        <Button
          variant="gold"
          onClick={() => {
            void navigate(MANAGED_APPS_ROUTES.create, { replace: true })
          }}
        >
          Continue deploying
        </Button>
      )}

      {phase === "error" && (
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={retryInstall} disabled={isRetrying} className="gap-2">
            {isRetrying && <Loader2 className="size-3.5 animate-spin" />}
            Try connecting again
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              void navigate(MANAGED_APPS_ROUTES.root, { replace: true })
            }}
          >
            Back to Managed Apps
          </Button>
        </div>
      )}
    </div>
  )
}
