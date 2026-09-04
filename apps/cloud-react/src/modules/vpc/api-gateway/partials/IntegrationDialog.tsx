import { useEffect, useState } from "react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
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
  Textarea,
} from "@datadack/common-ui"
import { Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { HTTP_METHODS, INTEGRATION_TYPE_OPTIONS } from "../apigw.constants"
import { useCreateIntegration, useUpdateIntegration, useVPCLinks } from "../apigw.hooks"
import type { APIGatewayIntegration, IntegrationType } from "../apigw.types"

const LABEL = "text-xs font-semibold uppercase tracking-wide text-muted-foreground"
interface Pair {
  key: string
  value: string
}
const rows = (value?: Record<string, string>): Pair[] =>
  Object.entries(value ?? {}).map(([key, val]) => ({ key, value: val }))
const record = (value: Pair[]) =>
  Object.fromEntries(value.filter((x) => x.key.trim()).map((x) => [x.key.trim(), x.value]))

export function IntegrationDialog({
  apiId,
  integration,
  open,
  onClose,
}: Readonly<{
  apiId: string
  integration: APIGatewayIntegration | null
  open: boolean
  onClose: () => void
}>) {
  const { t } = useTranslation(),
    create = useCreateIntegration(),
    update = useUpdateIntegration(),
    links = useVPCLinks()
  const [name, setName] = useState(""),
    [description, setDescription] = useState("")
  const [type, setType] = useState<IntegrationType>("HTTP_PROXY"),
    [uri, setUri] = useState("")
  const [method, setMethod] = useState("ANY"),
    [format, setFormat] = useState("2.0")
  const [connection, setConnection] = useState<"INTERNET" | "VPC_LINK">("INTERNET"),
    [link, setLink] = useState("")
  const [timeout, setTimeoutValue] = useState("30000"),
    [requestParameters, setRequestParameters] = useState<Pair[]>([])
  const [responseParameters, setResponseParameters] = useState<Pair[]>([]),
    [requestTemplates, setRequestTemplates] = useState<Pair[]>([])
  const [responseTemplates, setResponseTemplates] = useState<Pair[]>([]),
    [templateExpression, setTemplateExpression] = useState("")
  const [passthrough, setPassthrough] =
    useState<APIGatewayIntegration["passthrough_behavior"]>("WHEN_NO_MATCH")
  const [contentHandling, setContentHandling] =
    useState<APIGatewayIntegration["content_handling_strategy"]>("")
  const [tlsName, setTlsName] = useState(""),
    [credentials, setCredentials] = useState("")
  useEffect(() => {
    if (!open) return
    setName(integration?.name ?? "")
    setDescription(integration?.description ?? "")
    setType(integration?.integration_type ?? "HTTP_PROXY")
    setUri(integration?.integration_uri ?? "")
    setMethod(integration?.integration_method ?? "ANY")
    setFormat(integration?.payload_format_version ?? "2.0")
    setConnection(integration?.connection_type ?? "INTERNET")
    setLink(integration?.vpc_link_id ?? "")
    setTimeoutValue(String(integration?.timeout_millis ?? 30000))
    setRequestParameters(rows(integration?.request_parameters))
    setResponseParameters(rows(integration?.response_parameters))
    setRequestTemplates(rows(integration?.request_templates))
    setResponseTemplates(rows(integration?.response_templates))
    setTemplateExpression(integration?.template_selection_expression ?? "")
    setPassthrough(integration?.passthrough_behavior ?? "WHEN_NO_MATCH")
    setContentHandling(integration?.content_handling_strategy ?? "")
    setTlsName(integration?.tls_server_name_to_verify ?? "")
    setCredentials(integration?.credentials_id ?? "")
  }, [open, integration])
  const needsUri = type !== "MOCK",
    aws = type === "AWS" || type === "AWS_PROXY",
    pending = create.isPending || update.isPending
  const submit = () => {
    const payload = {
      name,
      description,
      integration_type: type,
      integration_uri: needsUri ? uri : "",
      integration_method: method,
      payload_format_version: aws ? format : "",
      connection_type: connection,
      vpc_link_id: connection === "VPC_LINK" ? link || undefined : undefined,
      timeout_millis: Number(timeout) || 0,
      request_parameters: record(requestParameters),
      response_parameters: record(responseParameters),
      request_templates: record(requestTemplates),
      response_templates: record(responseTemplates),
      template_selection_expression: templateExpression,
      passthrough_behavior: passthrough,
      content_handling_strategy: contentHandling,
      tls_server_name_to_verify: tlsName,
      credentials_id: credentials,
    }
    if (integration)
      update.mutate({ apiId, integrationId: integration.id, payload }, { onSuccess: onClose })
    else create.mutate({ apiId, payload }, { onSuccess: onClose })
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="glass-3 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t(
              integration
                ? "apiGateway.integrations.editTitle"
                : "apiGateway.integrations.createTitle",
            )}
          </DialogTitle>
          <DialogDescription>{t("apiGateway.integrations.dialogDescription")}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-3">
          <div className="space-y-4">
            <Field label={t("apiGateway.integrations.name")}>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                }}
              />
            </Field>
            <Field label={t("apiGateway.integrations.description")}>
              <Input
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                }}
              />
            </Field>
            <Field label={t("apiGateway.integrations.type")}>
              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v as IntegrationType)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTEGRATION_TYPE_OPTIONS.map((x) => (
                    <SelectItem key={x.value} value={x.value}>
                      {x.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {INTEGRATION_TYPE_OPTIONS.find((x) => x.value === type)?.description}
              </p>
            </Field>
            {needsUri && (
              <Field label={t("apiGateway.integrations.uri")}>
                <Input
                  required
                  type="url"
                  value={uri}
                  placeholder="https://api.example.com"
                  onChange={(e) => {
                    setUri(e.target.value)
                  }}
                />
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("apiGateway.integrations.method")}>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HTTP_METHODS.map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {aws && (
                <Field label={t("apiGateway.integrations.payloadFormat")}>
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
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("apiGateway.integrations.connectionType")}>
                <Select
                  value={connection}
                  onValueChange={(v) => {
                    setConnection(v as typeof connection)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INTERNET">
                      {t("apiGateway.integrations.internet")}
                    </SelectItem>
                    <SelectItem value="VPC_LINK">{t("apiGateway.integrations.vpcLink")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {connection === "VPC_LINK" && (
                <Field label={t("apiGateway.integrations.vpcLink")}>
                  <Select value={link} onValueChange={setLink}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {links.data?.map((x) => (
                        <SelectItem key={x.id} value={x.id}>
                          {x.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </div>
            <Field label={t("apiGateway.integrations.timeout")}>
              <Input
                type="number"
                min={0}
                value={timeout}
                onChange={(e) => {
                  setTimeoutValue(e.target.value)
                }}
              />
            </Field>
            <Accordion type="single" collapsible>
              <AccordionItem value="advanced">
                <AccordionTrigger>{t("apiGateway.integrations.advanced")}</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-3">
                  <PairEditor
                    label={t("apiGateway.integrations.requestParameters")}
                    value={requestParameters}
                    onChange={setRequestParameters}
                  />
                  <PairEditor
                    label={t("apiGateway.integrations.responseParameters")}
                    value={responseParameters}
                    onChange={setResponseParameters}
                  />
                  <PairEditor
                    multiline
                    label={t("apiGateway.integrations.requestTemplates")}
                    value={requestTemplates}
                    onChange={setRequestTemplates}
                  />
                  <PairEditor
                    multiline
                    label={t("apiGateway.integrations.responseTemplates")}
                    value={responseTemplates}
                    onChange={setResponseTemplates}
                  />
                  <Field label={t("apiGateway.integrations.templateExpression")}>
                    <Input
                      value={templateExpression}
                      onChange={(e) => {
                        setTemplateExpression(e.target.value)
                      }}
                    />
                  </Field>
                  <Field label={t("apiGateway.integrations.passthrough")}>
                    <Select
                      value={passthrough}
                      onValueChange={(v) => {
                        setPassthrough(v as typeof passthrough)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["WHEN_NO_MATCH", "WHEN_NO_TEMPLATES", "NEVER"].map((x) => (
                          <SelectItem key={x} value={x}>
                            {x}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={t("apiGateway.integrations.contentHandling")}>
                    <Select
                      value={contentHandling || "NONE"}
                      onValueChange={(v) => {
                        setContentHandling(v === "NONE" ? "" : (v as typeof contentHandling))
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">{t("apiGateway.integrations.none")}</SelectItem>
                        <SelectItem value="CONVERT_TO_TEXT">CONVERT_TO_TEXT</SelectItem>
                        <SelectItem value="CONVERT_TO_BINARY">CONVERT_TO_BINARY</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label={t("apiGateway.integrations.tlsName")}>
                    <Input
                      value={tlsName}
                      onChange={(e) => {
                        setTlsName(e.target.value)
                      }}
                    />
                  </Field>
                  <Field label={t("apiGateway.integrations.credentials")}>
                    <Input
                      value={credentials}
                      onChange={(e) => {
                        setCredentials(e.target.value)
                      }}
                    />
                  </Field>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("apiGateway.common.cancel")}
          </Button>
          <Button
            variant="gold"
            disabled={
              pending ||
              !name.trim() ||
              (needsUri && !uri.trim()) ||
              (connection === "VPC_LINK" && !link)
            }
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
function PairEditor({
  label,
  value,
  onChange,
  multiline = false,
}: Readonly<{ label: string; value: Pair[]; onChange: (v: Pair[]) => void; multiline?: boolean }>) {
  const { t } = useTranslation()
  return (
    <div className="space-y-2">
      <Label className={LABEL}>{label}</Label>
      {value.map((row, index) => (
        <div className="flex items-start gap-2" key={index}>
          <Input
            className="w-2/5"
            value={row.key}
            placeholder={t("apiGateway.integrations.key")}
            onChange={(e) => {
              onChange(value.map((x, i) => (i === index ? { ...x, key: e.target.value } : x)))
            }}
          />
          {multiline ? (
            <Textarea
              value={row.value}
              placeholder={t("apiGateway.integrations.value")}
              onChange={(e) => {
                onChange(value.map((x, i) => (i === index ? { ...x, value: e.target.value } : x)))
              }}
            />
          ) : (
            <Input
              value={row.value}
              placeholder={t("apiGateway.integrations.value")}
              onChange={(e) => {
                onChange(value.map((x, i) => (i === index ? { ...x, value: e.target.value } : x)))
              }}
            />
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("apiGateway.integrations.removeRow")}
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
        variant="outline"
        size="sm"
        onClick={() => {
          onChange([...value, { key: "", value: "" }])
        }}
      >
        <Plus className="size-4" />
        {t("apiGateway.integrations.addRow")}
      </Button>
    </div>
  )
}
