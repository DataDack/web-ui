import { useEffect, useRef, useState } from "react"

import { Button } from "@datadack/common-ui"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { extractError } from "@/services/api/client"

import { MONITORING_ROUTES } from "../monitoring.constants"
import { useJiraOAuthCallback } from "../monitoring.hooks"

type Phase = "working" | "done" | "error"

/**
 * Landing route for the Atlassian OAuth redirect
 * (/monitoring/channels/jira/callback?code=&state=). It posts code+state to the
 * backend, which exchanges them and stores the connection, then returns the
 * user to the Channels page. The exchange runs exactly once (StrictMode-safe).
 */
export function JiraOAuthCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { mutate: completeOAuth } = useJiraOAuthCallback()

  const code = params.get("code")
  const state = params.get("state")
  const oauthError = params.get("error")

  // Derive the initial state from the URL up front so we never call setState
  // synchronously inside the effect — only the async exchange resolves later.
  const invalid = Boolean(oauthError) || !code || !state
  const [phase, setPhase] = useState<Phase>(invalid ? "error" : "working")
  const [message, setMessage] = useState<string>(() => {
    if (oauthError) {
      return params.get("error_description") ?? "Jira authorization was cancelled or denied."
    }
    if (!code || !state) {
      return "Missing authorization code — please try connecting again."
    }
    return "Connecting your Jira account…"
  })

  const ranRef = useRef(false)

  useEffect(() => {
    // The null checks also narrow code/state to string for the call below.
    if (ranRef.current || !code || !state) return
    ranRef.current = true

    completeOAuth(
      { code, state },
      {
        onSuccess: (connections) => {
          setPhase("done")
          setMessage(`Connected to ${connections[0]?.site_url ?? "your Jira site"}.`)
          toast.success("Jira connected")
          window.setTimeout(() => {
            void navigate(MONITORING_ROUTES.channels, { replace: true })
          }, 900)
        },
        onError: (e) => {
          setPhase("error")
          setMessage(extractError(e, "Could not complete Jira sign-in."))
        },
      },
    )
  }, [code, state, completeOAuth, navigate])

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 text-center">
      {phase === "working" && <Loader2 className="size-8 animate-spin text-muted-foreground" />}
      {phase === "done" && <CheckCircle2 className="size-8 text-emerald-500" />}
      {phase === "error" && <XCircle className="size-8 text-destructive" />}

      <div className="space-y-1">
        <h1 className="text-lg font-semibold">
          {phase === "error" ? "Jira connection failed" : "Continue with Jira"}
        </h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>

      {phase === "error" && (
        <Button
          variant="outline"
          onClick={() => {
            void navigate(MONITORING_ROUTES.channels, { replace: true })
          }}
        >
          Back to channels
        </Button>
      )}
    </div>
  )
}
