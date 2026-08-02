import { useState } from "react"

import {
  Button,
  CopyButton,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@datadack/common-ui"
import { Link2, MailWarning } from "lucide-react"
import { useTranslation } from "react-i18next"

import { useCreateInvitation, useIAMGroups, useIAMRoles } from "../iam.hooks"
import type { InvitationResult } from "../iam.types"

const MEMBER_ROLES = ["member", "admin", "viewer", "billing", "owner"] as const

// Linear, backtracking-free email check (the backend re-validates).
function isValidEmail(value: string): boolean {
  if (/\s/.test(value)) return false
  const at = value.indexOf("@")
  return at > 0 && at < value.length - 1 && value.indexOf(".", at) > at + 1
}

/**
 * Invite-a-member dialog (email invitation with a one-time accept link).
 * Replaces the old standalone /iam/invitations/new page so callers — the Users
 * page, the ownership-transfer flow — can invite without leaving their context.
 * When the invite email can't be delivered, the accept link is surfaced here
 * for manual sharing instead of silently failing.
 */
export function InviteMemberDialog({
  open,
  onOpenChange,
}: Readonly<{
  open: boolean
  onOpenChange: (open: boolean) => void
}>) {
  const { t } = useTranslation()
  const { mutate: create, isPending } = useCreateInvitation()
  const { data: groups = [] } = useIAMGroups()
  const { data: roles = [] } = useIAMRoles()

  const [email, setEmail] = useState("")
  const [memberRole, setMemberRole] = useState("member")
  const [groupId, setGroupId] = useState("")
  const [roleId, setRoleId] = useState("")
  const [message, setMessage] = useState("")
  const [emailError, setEmailError] = useState("")
  const [result, setResult] = useState<InvitationResult | null>(null)

  // Reset on the open transition (not on close) so the link-fallback panel
  // isn't wiped mid-glance while the dialog animates out.
  const [prevOpen, setPrevOpen] = useState(false)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setEmail("")
      setMemberRole("member")
      setGroupId("")
      setRoleId("")
      setMessage("")
      setEmailError("")
      setResult(null)
    }
  }

  const close = () => {
    onOpenChange(false)
  }

  const submit = () => {
    if (!isValidEmail(email)) {
      setEmailError(t("iam.invitations.form.emailInvalid"))
      return
    }
    setEmailError("")
    create(
      {
        email,
        member_role: memberRole,
        group_ids: groupId ? [groupId] : undefined,
        role_id: roleId || undefined,
        message: message || undefined,
      },
      {
        onSuccess: (res) => {
          if (res.email_sent) close()
          else setResult(res)
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) onOpenChange(o)
        else close()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {result && !result.email_sent
              ? t("iam.invitations.linkPanel.title")
              : t("iam.invitations.form.title")}
          </DialogTitle>
          <DialogDescription>
            {result && !result.email_sent
              ? t("iam.invitations.linkPanel.description", {
                  email: result.invitation.email,
                })
              : t("iam.invitations.form.subtitle")}
          </DialogDescription>
        </DialogHeader>

        {result && !result.email_sent ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-[13px] text-amber-500">
              <MailWarning className="size-4 mt-0.5 shrink-0" />
              <p>
                {t("iam.invitations.linkPanel.description", {
                  email: result.invitation.email,
                })}
              </p>
            </div>
            <div className="glass-1 flex items-center gap-2 px-3 py-2.5">
              <Link2 className="size-4 text-muted-foreground shrink-0" />
              <CopyButton value={result.accept_url} className="min-w-0" />
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <Field label={t("iam.columns.email")} required>
              <Input
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                }}
                placeholder="teammate@company.com"
                className="font-mono"
                type="email"
              />
              {emailError && <p className="text-[11px] text-destructive">{emailError}</p>}
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t("iam.invitations.form.memberRole")}>
                <Select value={memberRole} onValueChange={setMemberRole}>
                  <SelectTrigger className="w-full text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMBER_ROLES.map((r) => (
                      <SelectItem key={r} value={r} className="text-[13px]">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label={t("iam.invitations.form.group")}>
                <Select value={groupId} onValueChange={setGroupId}>
                  <SelectTrigger className="w-full text-[13px]">
                    <SelectValue placeholder={t("iam.invitations.form.noGroup")} />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id} className="text-[13px]">
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label={t("iam.invitations.form.role")}>
                <Select value={roleId} onValueChange={setRoleId}>
                  <SelectTrigger className="w-full text-[13px]">
                    <SelectValue placeholder={t("iam.invitations.form.noRole")} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id} className="text-[13px]">
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label={t("iam.invitations.form.message")}>
              <Textarea
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value)
                }}
                placeholder={t("iam.invitations.form.messagePlaceholder")}
                rows={2}
                className="resize-none"
              />
            </Field>
          </div>
        )}

        <DialogFooter>
          {result && !result.email_sent ? (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setResult(null)
                }}
              >
                {t("iam.invitations.linkPanel.another")}
              </Button>
              <Button variant="gold" onClick={close}>
                {t("iam.invitations.linkPanel.done")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={close} disabled={isPending}>
                {t("console.wizard.cancel")}
              </Button>
              <Button variant="gold" onClick={submit} disabled={isPending}>
                {isPending ? t("iam.invitations.form.sending") : t("iam.invitations.invite")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  required,
  children,
}: Readonly<{ label: string; required?: boolean; children: React.ReactNode }>) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}
