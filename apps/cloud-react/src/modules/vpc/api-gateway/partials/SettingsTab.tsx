/* eslint-disable @typescript-eslint/no-misused-promises */
import { useState } from "react"

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  type TagRow,
} from "@datadack/common-ui"
import { Save, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { ConfirmDialog, FieldRow, Section, TagEditor } from "@/components/console"

import { APIGW_ROUTES, ENDPOINT_TYPE_OPTIONS } from "../apigw.constants"
import { useDeleteAPI, useUpdateAPI } from "../apigw.hooks"
import type {
  APIGateway,
  APIStatus,
  EndpointType,
  IPAddressType,
  SecurityPolicy,
} from "../apigw.types"
const tagRows = (tags: APIGateway["tags"]): TagRow[] => {
  if (typeof tags === "string") {
    try {
      return Object.entries(JSON.parse(tags) as Record<string, string>).map(([key, value]) => ({
        key,
        value,
      }))
    } catch {
      return [{ key: "", value: "" }]
    }
  }
  return Object.entries(tags).map(([key, value]) => ({ key, value }))
}
export function SettingsTab({ api }: Readonly<{ api: APIGateway }>) {
  const { t } = useTranslation()
  const navigate = useNavigate(),
    update = useUpdateAPI(),
    remove = useDeleteAPI()
  const [name, setName] = useState(api.name),
    [description, setDescription] = useState(api.description),
    [version, setVersion] = useState(api.version),
    [endpoint, setEndpoint] = useState<EndpointType>(api.endpoint_type),
    [ip, setIp] = useState<IPAddressType>(api.ip_address_type),
    [tls, setTls] = useState<SecurityPolicy>(api.security_policy),
    [disabled, setDisabled] = useState(api.disable_execute_api_endpoint),
    [routeExpression, setRouteExpression] = useState(api.route_selection_expression),
    [keyExpression, setKeyExpression] = useState(api.api_key_selection_expression),
    [status, setStatus] = useState<APIStatus>(api.status),
    [tags, setTags] = useState<TagRow[]>(tagRows(api.tags)),
    [confirming, setConfirming] = useState(false)
  const save = () => {
    update.mutate({
      id: api.id,
      payload: {
        name,
        description,
        version,
        endpoint_type: endpoint,
        ip_address_type: ip,
        security_policy: tls,
        disable_execute_api_endpoint: disabled,
        route_selection_expression: routeExpression,
        api_key_selection_expression: keyExpression,
        status,
        tags: JSON.stringify(
          Object.fromEntries(tags.filter((x) => x.key).map((x) => [x.key, x.value])),
        ),
      },
    })
  }
  return (
    <div className="space-y-5 pb-20">
      <Section
        variant="panel"
        title={t("apiGateway.settings.title")}
        description={t("apiGateway.settings.description")}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <FieldRow label={t("apiGateway.settings.name")} required>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
            />
          </FieldRow>
          <FieldRow label={t("apiGateway.settings.version")}>
            <Input
              value={version}
              onChange={(e) => {
                setVersion(e.target.value)
              }}
            />
          </FieldRow>
          <FieldRow className="md:col-span-2" label={t("apiGateway.settings.apiDescription")}>
            <Textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
              }}
            />
          </FieldRow>
          <FieldRow label={t("apiGateway.settings.endpointType")}>
            <Select
              value={endpoint}
              onValueChange={(v) => {
                setEndpoint(v as EndpointType)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENDPOINT_TYPE_OPTIONS.map((x) => (
                  <SelectItem key={x.value} value={x.value}>
                    {x.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label={t("apiGateway.settings.ipAddressType")}>
            <Select
              value={ip}
              onValueChange={(v) => {
                setIp(v as IPAddressType)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ipv4">IPv4</SelectItem>
                <SelectItem value="dualstack">{t("apiGateway.settings.dualStack")}</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label={t("apiGateway.settings.tlsPolicy")}>
            <Select
              value={tls}
              onValueChange={(v) => {
                setTls(v as SecurityPolicy)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TLS_1_0">TLS 1.0</SelectItem>
                <SelectItem value="TLS_1_2">TLS 1.2</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label={t("apiGateway.settings.status")}>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as APIStatus)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">{t("apiGateway.settings.available")}</SelectItem>
                <SelectItem value="inactive">{t("apiGateway.settings.inactive")}</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
          <FieldRow label={t("apiGateway.settings.routeExpression")}>
            <Input
              className="font-mono"
              value={routeExpression}
              onChange={(e) => {
                setRouteExpression(e.target.value)
              }}
            />
          </FieldRow>
          <FieldRow label={t("apiGateway.settings.keyExpression")}>
            <Input
              className="font-mono"
              value={keyExpression}
              onChange={(e) => {
                setKeyExpression(e.target.value)
              }}
            />
          </FieldRow>
          <FieldRow
            className="md:col-span-2"
            label={t("apiGateway.settings.disableEndpoint")}
            aside={<Switch checked={disabled} onCheckedChange={setDisabled} />}
          >
            <p className="text-xs text-muted-foreground">
              {t("apiGateway.settings.disableEndpointHelp")}
            </p>
          </FieldRow>
        </div>
      </Section>
      <Section variant="panel" title={t("apiGateway.settings.tags")}>
        <TagEditor rows={tags.length ? tags : [{ key: "", value: "" }]} onChange={setTags} />
      </Section>
      <Section
        variant="panel"
        tone="danger"
        title={t("apiGateway.settings.dangerTitle")}
        description={t("apiGateway.settings.dangerDescription")}
      >
        <Button
          variant="destructive"
          onClick={() => {
            setConfirming(true)
          }}
        >
          <Trash2 className="size-4" />
          {t("apiGateway.detail.delete")}
        </Button>
      </Section>
      <div className="sticky bottom-4 flex justify-end">
        <Button variant="gold" onClick={save} loading={update.isPending} disabled={!name.trim()}>
          <Save className="size-4" />
          {t("apiGateway.common.save")}
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t("apiGateway.detail.deleteTitle", { name: api.name })}
        description={t("apiGateway.detail.deleteDescription", { name: api.name })}
        confirmText={api.name}
        confirmLabel={t("apiGateway.detail.delete")}
        loading={remove.isPending}
        onConfirm={() => {
          remove.mutate(api.id, { onSuccess: () => navigate(APIGW_ROUTES.LIST) })
        }}
      />
    </div>
  )
}
