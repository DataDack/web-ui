import { useState } from "react"

import { useMutation, useQuery } from "@tanstack/react-query"
import { CheckCircle2, Loader2, MailX } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/modules/auth/auth.context"
import type { AuthTokenResponse } from "@/modules/auth/auth.types"
import { useScreen } from "@/services/api/screen"

import { iamService } from "../iam.service"

export function AcceptInvitePage() {
  useScreen("iam.accept-invite")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { authenticate } = useAuth()
  const [params] = useSearchParams()
  const token = params.get("token") ?? ""
  const [name, setName] = useState("")

  const {
    data: preview,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["invite-validate", token],
    queryFn: () => iamService.validateInvitation(token),
    enabled: !!token,
    retry: false,
  })

  const accept = useMutation({
    mutationFn: () => iamService.acceptInvitation(token, name || undefined),
    onSuccess: (res: AuthTokenResponse) => {
      authenticate(res)
      void navigate("/", { replace: true })
    },
  })

  const renderBody = () => {
    if (!token || isError) {
      return (
        <State
          icon={<MailX className="size-8 text-destructive" />}
          title={t("iam.invitations.accept.invalidTitle")}
          description={t("iam.invitations.accept.invalidDescription")}
        >
          <Button variant="outline" onClick={() => void navigate("/login")}>
            {t("iam.invitations.accept.toLogin")}
          </Button>
        </State>
      )
    }
    if (isLoading || !preview) {
      return (
        <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
          <p className="text-sm">{t("iam.invitations.accept.loading")}</p>
        </div>
      )
    }
    return (
      <>
        <div className="text-center space-y-1.5">
          <CheckCircle2 className="size-8 text-status-info mx-auto" />
          <h1 className="text-lg font-semibold">{t("iam.invitations.accept.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("iam.invitations.accept.invitedAs", { role: preview.member_role })}
          </p>
          <p className="font-mono text-[12px] text-muted-foreground">{preview.email}</p>
        </div>

        {preview.message && (
          <p className="text-[13px] text-muted-foreground border-l-2 border-border-glass pl-3">
            {preview.message}
          </p>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            {t("iam.invitations.accept.nameLabel")}
          </Label>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
            }}
            placeholder={t("iam.invitations.accept.namePlaceholder")}
          />
        </div>

        {accept.isError && (
          <p className="text-[12px] text-destructive">{t("iam.invitations.accept.failed")}</p>
        )}

        <Button
          className="w-full gap-2"
          disabled={accept.isPending}
          onClick={() => {
            accept.mutate()
          }}
        >
          {accept.isPending && <Loader2 className="size-4 animate-spin" />}
          {t("iam.invitations.accept.cta")}
        </Button>
      </>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md glass-1 rounded-xl p-7 space-y-5">{renderBody()}</div>
    </div>
  )
}

function State({
  icon,
  title,
  description,
  children,
}: Readonly<{
  icon: React.ReactNode
  title: string
  description: string
  children?: React.ReactNode
}>) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      {icon}
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      {children}
    </div>
  )
}
