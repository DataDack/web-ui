import { useEffect, useState } from "react"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@datadack/common-ui"
import { Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { useCreateAuthorizer, useUpdateAuthorizer } from "../apigw.hooks"
import type { APIGatewayAuthorizer, AuthorizerType } from "../apigw.types"

const TYPES: AuthorizerType[] = ["JWT", "REQUEST", "TOKEN"]
const LABEL = "text-xs font-semibold uppercase tracking-wide text-muted-foreground"
export function AuthorizerDialog({
  apiId,
  authorizer,
  open,
  onClose,
}: Readonly<{
  apiId: string
  authorizer: APIGatewayAuthorizer | null
  open: boolean
  onClose: () => void
}>) {
  const { t } = useTranslation(),
    create = useCreateAuthorizer(),
    update = useUpdateAuthorizer()
  const [name, setName] = useState(""),
    [type, setType] = useState<AuthorizerType>("JWT"),
    [identity, setIdentity] = useState<string[]>([])
  const [issuer, setIssuer] = useState(""),
    [audience, setAudience] = useState<string[]>([]),
    [uri, setUri] = useState("")
  const [format, setFormat] = useState("2.0"),
    [simple, setSimple] = useState(false),
    [ttl, setTtl] = useState("300"),
    [credentials, setCredentials] = useState("")
  useEffect(() => {
    if (!open) return
    setName(authorizer?.name ?? "")
    setType(authorizer?.authorizer_type ?? "JWT")
    setIdentity(authorizer?.identity_source ?? [])
    setIssuer(authorizer?.jwt_issuer ?? "")
    setAudience(authorizer?.jwt_audience ?? [])
    setUri(authorizer?.authorizer_uri ?? "")
    setFormat(authorizer?.authorizer_payload_format_version ?? "2.0")
    setSimple(authorizer?.enable_simple_responses ?? false)
    setTtl(String(authorizer?.authorizer_result_ttl_seconds ?? 300))
    setCredentials(authorizer?.authorizer_credentials ?? "")
  }, [open, authorizer])
  const functional = type !== "JWT",
    pending = create.isPending || update.isPending
  const submit = () => {
    const payload = {
      name,
      authorizer_type: type,
      identity_source: identity.filter((x) => x.trim()),
      jwt_issuer: type === "JWT" ? issuer : "",
      jwt_audience: type === "JWT" ? audience.filter((x) => x.trim()) : [],
      authorizer_uri: functional ? uri : "",
      authorizer_payload_format_version: functional ? format : "",
      enable_simple_responses: functional && simple,
      authorizer_result_ttl_seconds: Number(ttl) || 0,
      authorizer_credentials: functional ? credentials : "",
    }
    if (authorizer)
      update.mutate({ apiId, authorizerId: authorizer.id, payload }, { onSuccess: onClose })
    else create.mutate({ apiId, payload }, { onSuccess: onClose })
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="glass-3 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {t(
              authorizer
                ? "apiGateway.authorizers.editTitle"
                : "apiGateway.authorizers.createTitle",
            )}
          </DialogTitle>
          <DialogDescription>{t("apiGateway.authorizers.dialogDescription")}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-3">
          <div className="space-y-4">
            <Field label={t("apiGateway.authorizers.name")}>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                }}
              />
            </Field>
            <Field label={t("apiGateway.authorizers.type")}>
              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v as AuthorizerType)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`apiGateway.authorizers.types.${value}.label`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t(`apiGateway.authorizers.types.${type}.description`)}
              </p>
            </Field>
            <ListEditor
              label={t("apiGateway.authorizers.identitySource")}
              value={identity}
              onChange={setIdentity}
            />
            {type === "JWT" ? (
              <>
                <Field label={t("apiGateway.authorizers.jwtIssuer")}>
                  <Input
                    required
                    type="url"
                    value={issuer}
                    onChange={(e) => {
                      setIssuer(e.target.value)
                    }}
                  />
                </Field>
                <ListEditor
                  label={t("apiGateway.authorizers.jwtAudience")}
                  value={audience}
                  onChange={setAudience}
                />
              </>
            ) : (
              <>
                <Field label={t("apiGateway.authorizers.authorizerUri")}>
                  <Input
                    required
                    value={uri}
                    onChange={(e) => {
                      setUri(e.target.value)
                    }}
                  />
                </Field>
                <Field label={t("apiGateway.authorizers.payloadFormat")}>
                  <Select value={format} onValueChange={setFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1.0">1.0</SelectItem>
                      <SelectItem value="2.0">2.0</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <div className="flex items-center justify-between gap-4 glass-1 p-3">
                  <Label>{t("apiGateway.authorizers.simpleResponses")}</Label>
                  <Switch checked={simple} onCheckedChange={setSimple} />
                </div>
                <Field label={t("apiGateway.authorizers.credentials")}>
                  <Input
                    value={credentials}
                    onChange={(e) => {
                      setCredentials(e.target.value)
                    }}
                  />
                </Field>
              </>
            )}
            <Field label={t("apiGateway.authorizers.ttl")}>
              <Input
                type="number"
                min={0}
                value={ttl}
                onChange={(e) => {
                  setTtl(e.target.value)
                }}
              />
              <p className="text-xs text-muted-foreground">{t("apiGateway.authorizers.ttlHelp")}</p>
            </Field>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("apiGateway.common.cancel")}
          </Button>
          <Button
            variant="gold"
            disabled={pending || !name.trim() || (type === "JWT" ? !issuer.trim() : !uri.trim())}
            onClick={submit}
          >
            {t("apiGateway.common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="space-y-1.5">
      <Label className={LABEL}>{label}</Label>
      {children}
    </div>
  )
}
function ListEditor({
  label,
  value,
  onChange,
}: Readonly<{ label: string; value: string[]; onChange: (v: string[]) => void }>) {
  const { t } = useTranslation()
  return (
    <div className="space-y-2">
      <Label className={LABEL}>{label}</Label>
      {value.map((item, index) => (
        <div className="flex gap-2" key={index}>
          <Input
            value={item}
            onChange={(e) => {
              onChange(value.map((x, i) => (i === index ? e.target.value : x)))
            }}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t("apiGateway.authorizers.removeValue")}
            onClick={() => {
              onChange(value.filter((_, i) => i !== index))
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => {
          onChange([...value, ""])
        }}
      >
        <Plus className="size-4" />
        {t("apiGateway.authorizers.addValue")}
      </Button>
    </div>
  )
}
