import { useEffect, useState } from "react"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from "@datadack/common-ui"
import { CheckCircle2, FileKey2, Loader2, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { extractError } from "@/services/api/client"

import { useImportCertificate } from "../certificates.hooks"
import type { ImportCertificateResult } from "../certificates.types"

const BEGIN_CERT = "-----BEGIN CERTIFICATE-----"

/**
 * Bring your own certificate: body, chain, private key.
 *
 * Three boxes rather than one bundle, matching what a CA hands over. The chain
 * gets its own box because leaving the intermediates out is the most common TLS
 * misconfiguration there is — it works in the browser that cached them and fails
 * everywhere else — and an empty box is how a person notices.
 *
 * The server does all the real validation (key matches, not expired, names are
 * connected to this account). The client only catches a paste into the wrong box.
 */
export function ImportCertificateDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [certificate, setCertificate] = useState("")
  const [chain, setChain] = useState("")
  const [privateKey, setPrivateKey] = useState("")
  const [result, setResult] = useState<ImportCertificateResult | null>(null)
  const mutation = useImportCertificate()
  const resetMutation = mutation.reset

  // Fresh form per opening — and, as importantly, the private key does not
  // linger in component state after the dialog closes.
  useEffect(() => {
    if (open) return
    setCertificate("")
    setChain("")
    setPrivateKey("")
    setResult(null)
    resetMutation()
  }, [open, resetMutation])

  const certLooksRight = certificate.trim() === "" || certificate.includes(BEGIN_CERT)
  const keyLooksRight = privateKey.trim() === "" || privateKey.includes("PRIVATE KEY-----")
  const keyInCertBox = certificate.includes("PRIVATE KEY-----")
  let certError: string | undefined
  if (keyInCertBox) certError = t("domains.certificates.import.keyInCertBox")
  else if (!certLooksRight) certError = t("domains.certificates.import.notPem")
  const canSubmit =
    certificate.includes(BEGIN_CERT) &&
    privateKey.includes("PRIVATE KEY-----") &&
    !keyInCertBox &&
    !mutation.isPending

  const submit = () => {
    if (!canSubmit) return
    mutation.mutate(
      { certificate, chain, private_key: privateKey },
      {
        onSuccess: (res) => {
          setPrivateKey("")
          setResult(res)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileKey2 className="size-4" />
            {result
              ? t("domains.certificates.import.doneTitle")
              : t("domains.certificates.import.title")}
          </DialogTitle>
          <DialogDescription>
            {result
              ? t("domains.certificates.import.doneHelp")
              : t("domains.certificates.import.help")}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-4 shrink-0 text-status-success" />
              {t("domains.certificates.import.servedOn", { count: result.hostnames.length })}
            </p>
            <ul className="space-y-1 rounded-lg border border-border/60 p-3 font-mono text-xs">
              {result.hostnames.map((host) => (
                <li key={host}>{host}</li>
              ))}
            </ul>
            {result.warnings?.map((warning) => (
              <p key={warning} className="flex gap-2 text-xs text-status-warning">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                {warning}
              </p>
            ))}
            <p className="text-xs text-muted-foreground">
              {t("domains.certificates.import.noRenewal")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <PemField
              id="cert-body"
              label={t("domains.certificates.import.certificate")}
              hint={t("domains.certificates.import.certificateHint")}
              value={certificate}
              onChange={setCertificate}
              error={certError}
            />
            <PemField
              id="cert-chain"
              label={t("domains.certificates.import.chain")}
              hint={t("domains.certificates.import.chainHint")}
              value={chain}
              onChange={setChain}
              optional={t("domains.certificates.import.optional")}
            />
            <PemField
              id="cert-key"
              label={t("domains.certificates.import.privateKey")}
              hint={t("domains.certificates.import.privateKeyHint")}
              value={privateKey}
              onChange={setPrivateKey}
              error={keyLooksRight ? undefined : t("domains.certificates.import.notKey")}
            />
            {mutation.isError && (
              <p className="text-xs text-status-danger">
                {extractError(mutation.error, t("domains.certificates.import.failed"))}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button
              onClick={() => {
                onOpenChange(false)
                void navigate(`/domains/certificates/${result.certificate.id}`)
              }}
            >
              {t("domains.certificates.import.view")}
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  onOpenChange(false)
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button onClick={submit} disabled={!canSubmit}>
                {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
                {t("domains.certificates.import.submit")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PemField({
  id,
  label,
  hint,
  value,
  onChange,
  error,
  optional,
}: Readonly<{
  id: string
  label: string
  hint: string
  value: string
  onChange: (value: string) => void
  error?: string
  optional?: string
}>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-2">
        {label}
        {optional && <span className="text-xs font-normal text-muted-foreground">{optional}</span>}
      </Label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
        }}
        rows={4}
        spellCheck={false}
        autoComplete="off"
        className="max-h-40 font-mono text-[11px]"
        placeholder="-----BEGIN …-----"
      />
      {error ? (
        <p className="text-xs text-status-danger">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}
