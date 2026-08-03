import { useEffect, useState } from "react"

import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"

import { apiErrorMessage } from "@/lib/api"
import { sessionIsUsable, useSession, useSignIn } from "@/lib/auth"

import { Button, Input, Label, Logo } from "@datadack/common-ui"

interface LocationState {
  from?: string
}

/**
 * Sign-in for the control-plane console.
 *
 * The credentials are the operator's ordinary platform account. The control
 * plane forwards them to the identity service and only accepts the answer if
 * the token that comes back carries the platform super-admin flag — so a normal
 * cloud user can type a correct password here and still be turned away, which
 * the copy below says up front rather than leaving them to discover.
 */
export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: session, isPending: sessionPending } = useSession()
  const signIn = useSignIn()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const from = (location.state as LocationState | null)?.from ?? "/functions"

  // Signing in resolves the session query, and this is what acts on it. Doing it
  // in the mutation's onSuccess instead would navigate from inside a callback
  // that also runs on a background refetch.
  useEffect(() => {
    if (signIn.isSuccess) {
      void navigate(from, { replace: true })
    }
  }, [signIn.isSuccess, navigate, from])

  // Already signed in — usually an operator who hit /login directly or came back
  // to a tab whose session is still good.
  if (!sessionPending && sessionIsUsable(session) && !signIn.isPending) {
    return <Navigate to={from} replace />
  }

  const submitting = signIn.isPending
  const disabled = submitting || email.trim() === "" || password === ""

  return (
    <div className="bg-background bg-gradient-surface flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Logo iconSrc="/admin/datadack-icon.png" iconClassName="size-7" className="text-[17px]" />
          <div className="text-center">
            <h1 className="text-[15px] font-medium">Serverless control plane</h1>
            <p className="text-muted-foreground mt-1 text-[12px]">
              Sign in with your platform account
            </p>
          </div>
        </div>

        <form
          className="border-border/50 bg-card rounded-xl border p-5"
          onSubmit={(event) => {
            event.preventDefault()
            signIn.mutate({ email: email.trim(), password })
          }}
        >
          <div className="mb-4">
            <Label htmlFor="email" className="mb-1.5 text-[12px]">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              autoComplete="username"
              placeholder="you@datadack.cloud"
              onChange={(event) => {
                setEmail(event.target.value)
              }}
              className="h-9 text-[13px]"
            />
          </div>

          <div className="mb-4">
            <Label htmlFor="password" className="mb-1.5 text-[12px]">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => {
                setPassword(event.target.value)
              }}
              className="h-9 text-[13px]"
            />
          </div>

          {signIn.isError && (
            <div
              role="alert"
              className="text-status-danger border-status-danger/30 bg-status-danger/5 mb-4 flex items-start gap-2 rounded-lg border p-2.5 text-[12px]"
            >
              <AlertTriangle className="mt-px size-3.5 shrink-0" />
              <span>{apiErrorMessage(signIn.error)}</span>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={disabled}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {submitting ? "Signing in" : "Sign in"}
          </Button>
        </form>

        <p className="text-muted-foreground mt-4 flex items-start justify-center gap-1.5 text-center text-[11px]">
          <ShieldCheck className="mt-px size-3.5 shrink-0" />
          <span>This console is limited to platform super admins.</span>
        </p>
      </div>
    </div>
  )
}
