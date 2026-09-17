import { useEffect, useState } from "react"

import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@datadack/common-ui"
import { Globe, Loader2, ShieldCheck } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"

import { extractError } from "@/services/api/client"

import { useRequestCertificate } from "../certificates.hooks"
import { useDomains } from "../domains.hooks"

/**
 * Ask DataDack to obtain a certificate for one of the account's own domains.
 *
 * Only verified, connected hostnames are offered, because those are the only
 * ones a certificate authority can validate: it fetches a token over HTTP from
 * the hostname itself, and that only reaches DataDack once DNS points here. An
 * unverified domain in this list would be a request that never completes.
 */
export function RequestCertificateDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string | null>(null)
  const request = useRequestCertificate()
  const resetRequest = request.reset
  const { data, isLoading } = useDomains({ managed: false, status: "active", limit: 100, page: 1 })
  const hostnames = (data?.rows ?? []).map((d) => d.hostname)

  useEffect(() => {
    if (open) return
    setSelected(null)
    resetRequest()
  }, [open, resetRequest])

  const submit = () => {
    if (!selected) return
    request.mutate(selected, {
      onSuccess: (cert) => {
        onOpenChange(false)
        void navigate(`/domains/certificates/${cert.id}`)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            {t("domains.certificates.request.title")}
          </DialogTitle>
          <DialogDescription>{t("domains.certificates.request.help")}</DialogDescription>
        </DialogHeader>

        {isLoading && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            {t("common.loading")}
          </p>
        )}
        {!isLoading && hostnames.length === 0 && (
          <div className="space-y-2 rounded-lg border border-border/60 p-4 text-sm">
            <p>{t("domains.certificates.request.noDomains")}</p>
            <Link
              to="/domains/hostnames"
              className="text-primary underline-offset-4 hover:underline"
            >
              {t("domains.certificates.request.connectDomain")}
            </Link>
          </div>
        )}
        {!isLoading && hostnames.length > 0 && (
          <div
            role="radiogroup"
            aria-label={t("domains.certificates.request.pick")}
            className="max-h-72 space-y-1 overflow-y-auto"
          >
            {hostnames.map((host) => (
              <button
                key={host}
                type="button"
                role="radio"
                aria-checked={selected === host}
                onClick={() => {
                  setSelected(host)
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left font-mono text-[13px] transition-colors",
                  selected === host
                    ? "border-primary bg-primary/10"
                    : "border-border/60 hover:bg-muted/50",
                )}
              >
                <Globe className="size-3.5 shrink-0 text-muted-foreground" />
                {host}
              </button>
            ))}
          </div>
        )}

        {request.isError && (
          <p className="text-xs text-status-danger">
            {extractError(request.error, t("domains.certificates.request.failed"))}
          </p>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={!selected || request.isPending}>
            {request.isPending && <Loader2 className="size-4 animate-spin" />}
            {t("domains.certificates.request.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
