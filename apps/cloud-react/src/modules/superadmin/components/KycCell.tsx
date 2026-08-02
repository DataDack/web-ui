import { useState } from "react"

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
} from "@datadack/common-ui"
import {
  CircleCheck,
  CircleSlash,
  Clock,
  MoreHorizontal,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { useSetKycStatus } from "../superadmin.hooks"

/**
 * A user's identity-verification state, and the operator's two overrides.
 *
 * The state is two independent flags, which is why it needs a cell rather than a
 * boolean: `kyc_completed` records whether verification ever succeeded,
 * `need_actions` whether the platform is currently waiting on the user. They
 * combine into three situations worth telling apart — verified and clear,
 * verified but asked to verify again, and never verified.
 */

export interface KycSubject {
  id: string
  name: string
  email: string
  kyc_completed: boolean
  need_actions: boolean
}

type KycState = "verified" | "reverifying" | "unverified"

function stateOf(user: KycSubject): KycState {
  if (user.need_actions) return user.kyc_completed ? "reverifying" : "unverified"
  return user.kyc_completed ? "verified" : "unverified"
}

export function KycBadge({ user }: Readonly<{ user: KycSubject }>) {
  const { t } = useTranslation()
  const state = stateOf(user)

  if (state === "verified") {
    return (
      <Badge variant="outline" className="border-status-success/30 text-status-success gap-1.5">
        <CircleCheck className="size-3" />
        {t("superAdmin.kyc.state.verified")}
      </Badge>
    )
  }

  if (state === "reverifying") {
    return (
      <Badge variant="outline" className="border-status-warning/30 text-status-warning gap-1.5">
        <Clock className="size-3" />
        {t("superAdmin.kyc.state.reverifying")}
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="text-muted-foreground gap-1.5">
      <CircleSlash className="size-3" />
      {t("superAdmin.kyc.state.unverified")}
    </Badge>
  )
}

type PendingAction = "bypass" | "reverify"

/**
 * The override menu. Both actions go through a confirmation that takes a reason,
 * because each one changes who can reach the platform: a bypass lets an
 * unverified person in, and a re-verification request locks a working user out
 * of everything gated until they comply. The reason is logged server-side.
 */
export function KycActions({ user }: Readonly<{ user: KycSubject }>) {
  const { t } = useTranslation()
  const { mutate: setKyc, isPending } = useSetKycStatus()
  const [action, setAction] = useState<PendingAction | null>(null)
  const [reason, setReason] = useState("")

  const state = stateOf(user)

  const close = () => {
    setAction(null)
    setReason("")
  }

  const confirm = () => {
    if (!action) return
    const patch =
      action === "bypass"
        ? { kyc_completed: true, need_actions: false, reason: reason.trim() }
        : { need_actions: true, reason: reason.trim() }

    setKyc({ id: user.id, patch }, { onSuccess: close })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 text-muted-foreground"
            aria-label={t("superAdmin.kyc.actions.menu")}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>{t("superAdmin.kyc.actions.title")}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Offered unless they are already verified and clear — there would be
              nothing for a bypass to change. */}
          {state !== "verified" && (
            <DropdownMenuItem
              onClick={() => {
                setAction("bypass")
              }}
            >
              <ShieldCheck className="size-3.5" />
              {t("superAdmin.kyc.actions.bypass")}
            </DropdownMenuItem>
          )}

          {!user.need_actions && (
            <DropdownMenuItem
              onClick={() => {
                setAction("reverify")
              }}
            >
              <ShieldAlert className="size-3.5" />
              {t("superAdmin.kyc.actions.reverify")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={action !== null}
        onOpenChange={(open) => {
          if (!open) close()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {action === "bypass"
                ? t("superAdmin.kyc.confirm.bypassTitle")
                : t("superAdmin.kyc.confirm.reverifyTitle")}
            </DialogTitle>
            <DialogDescription>
              {action === "bypass"
                ? t("superAdmin.kyc.confirm.bypassBody", { name: user.name || user.email })
                : t("superAdmin.kyc.confirm.reverifyBody", { name: user.name || user.email })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="kyc-reason">{t("superAdmin.kyc.confirm.reasonLabel")}</Label>
            <Input
              id="kyc-reason"
              value={reason}
              maxLength={280}
              placeholder={t("superAdmin.kyc.confirm.reasonPlaceholder")}
              onChange={(event) => {
                setReason(event.target.value)
              }}
            />
            <p className="text-[12px] text-muted-foreground">
              {t("superAdmin.kyc.confirm.reasonHint")}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={isPending}>
              {t("common.cancel")}
            </Button>
            <Button
              variant={action === "reverify" ? "destructive" : "default"}
              onClick={confirm}
              // A reason is required: an override with no justification is the
              // thing the audit line exists to prevent.
              disabled={isPending || reason.trim() === ""}
            >
              {action === "bypass"
                ? t("superAdmin.kyc.actions.bypass")
                : t("superAdmin.kyc.actions.reverify")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
