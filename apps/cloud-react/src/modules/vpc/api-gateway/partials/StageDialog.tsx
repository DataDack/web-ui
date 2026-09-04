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

import { LOGGING_LEVEL_OPTIONS } from "../apigw.constants"
import { useCreateStage, useRoutes, useUpdateStage } from "../apigw.hooks"
import type { APIGatewayStage, LoggingLevel, RouteSetting } from "../apigw.types"

const LABEL = "text-xs font-semibold uppercase tracking-wide text-muted-foreground"

/** A stage variable as the editor holds it: an ordered pair, not a map. */
interface VariableRow {
  key: string
  value: string
}

/**
 * A per-route override as the editor holds it.
 *
 * `rate` and `burst` are strings rather than numbers so that "not overridden"
 * (empty) stays distinguishable from "overridden to 0". That difference is the
 * whole reason the backend models these as pointers: a route throttled to 0 is
 * a deliberate block, and collapsing it into "inherit the stage default" would
 * silently reopen a route somebody closed.
 */
interface OverrideRow {
  routeKey: string
  rate: string
  burst: string
  logging: LoggingLevel | "INHERIT"
}

function toVariableRows(vars: Record<string, string> | undefined): VariableRow[] {
  return Object.entries(vars ?? {}).map(([key, value]) => ({ key, value }))
}

function toOverrideRows(settings: Record<string, RouteSetting> | undefined): OverrideRow[] {
  return Object.entries(settings ?? {}).map(([routeKey, setting]) => ({
    routeKey,
    rate: setting.throttling_rate_limit === undefined ? "" : String(setting.throttling_rate_limit),
    burst:
      setting.throttling_burst_limit === undefined ? "" : String(setting.throttling_burst_limit),
    logging: setting.logging_level ?? "INHERIT",
  }))
}

/** Drop blank keys so a half-typed row never lands in the payload. */
function fromVariableRows(rows: VariableRow[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const row of rows) {
    const key = row.key.trim()
    if (key) out[key] = row.value
  }
  return out
}

function fromOverrideRows(rows: OverrideRow[]): Record<string, RouteSetting> {
  const out: Record<string, RouteSetting> = {}
  for (const row of rows) {
    const key = row.routeKey.trim()
    if (!key) continue
    const setting: RouteSetting = {}
    // An empty field means "inherit"; a field holding 0 means an explicit zero.
    if (row.rate !== "") setting.throttling_rate_limit = Number(row.rate)
    if (row.burst !== "") setting.throttling_burst_limit = Number(row.burst)
    if (row.logging !== "INHERIT") setting.logging_level = row.logging
    if (Object.keys(setting).length > 0) out[key] = setting
  }
  return out
}

/**
 * Create or edit one stage.
 *
 * `stage` null means create. The name is only editable on create: renaming a
 * stage would break every custom-domain mapping and usage plan pointing at it,
 * and the backend keys stages by (api_id, name) for that reason.
 */
export function StageDialog({
  apiId,
  stage,
  open,
  onClose,
}: Readonly<{
  apiId: string
  stage: APIGatewayStage | null
  open: boolean
  onClose: () => void
}>) {
  const { t } = useTranslation()
  const { mutate: create, isPending: creating } = useCreateStage()
  const { mutate: update, isPending: updating } = useUpdateStage()
  const { data: routes = [] } = useRoutes(apiId)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [autoDeploy, setAutoDeploy] = useState(true)
  const [rate, setRate] = useState("0")
  const [burst, setBurst] = useState("0")
  const [logging, setLogging] = useState<LoggingLevel>("OFF")
  const [dataTrace, setDataTrace] = useState(false)
  const [metrics, setMetrics] = useState(false)
  const [accessLog, setAccessLog] = useState(false)
  const [accessLogDestination, setAccessLogDestination] = useState("")
  const [accessLogFormat, setAccessLogFormat] = useState("")
  const [variables, setVariables] = useState<VariableRow[]>([])
  const [overrides, setOverrides] = useState<OverrideRow[]>([])

  // Reload the form whenever the dialog is opened on a different stage, so a
  // second Edit never shows the previous stage's values.
  useEffect(() => {
    if (!open) return
    setName(stage?.name ?? "")
    setDescription(stage?.description ?? "")
    setAutoDeploy(stage?.auto_deploy ?? true)
    setRate(String(stage?.throttling_rate_limit ?? 0))
    setBurst(String(stage?.throttling_burst_limit ?? 0))
    setLogging(stage?.logging_level ?? "OFF")
    setDataTrace(stage?.data_trace_enabled ?? false)
    setMetrics(stage?.detailed_metrics_enabled ?? false)
    setAccessLog(stage?.access_log_enabled ?? false)
    setAccessLogDestination(stage?.access_log_destination ?? "")
    setAccessLogFormat(stage?.access_log_format ?? "")
    setVariables(toVariableRows(stage?.stage_variables))
    setOverrides(toOverrideRows(stage?.route_settings))
  }, [open, stage])

  const pending = creating || updating

  const submit = () => {
    const payload = {
      description,
      auto_deploy: autoDeploy,
      stage_variables: fromVariableRows(variables),
      throttling_rate_limit: Number(rate) || 0,
      throttling_burst_limit: Number(burst) || 0,
      detailed_metrics_enabled: metrics,
      logging_level: logging,
      data_trace_enabled: dataTrace,
      route_settings: fromOverrideRows(overrides),
      access_log_enabled: accessLog,
      access_log_destination: accessLogDestination,
      access_log_format: accessLogFormat,
      client_certificate_id: stage?.client_certificate_id ?? "",
    }
    if (stage) {
      update({ apiId, stageId: stage.id, payload }, { onSuccess: onClose })
      return
    }
    create({ apiId, payload: { ...payload, name } }, { onSuccess: onClose })
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
            {stage ? t("apiGateway.stages.editTitle") : t("apiGateway.stages.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("apiGateway.stages.dialogDescription")}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-5">
            {!stage && (
              <div className="space-y-1.5">
                <Label className={LABEL}>{t("apiGateway.stages.name")}</Label>
                <Input
                  className="font-mono"
                  value={name}
                  placeholder="$default"
                  onChange={(e) => {
                    setName(e.target.value)
                  }}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className={LABEL}>{t("apiGateway.stages.description")}</Label>
              <Input
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-4 glass-1 p-3">
              <div>
                <p className="text-sm font-medium">{t("apiGateway.stages.autoDeploy")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("apiGateway.wizard.stages.autoDeployHelp")}
                </p>
              </div>
              <Switch checked={autoDeploy} onCheckedChange={setAutoDeploy} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className={LABEL}>{t("apiGateway.stages.rate")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={rate}
                  onChange={(e) => {
                    setRate(e.target.value)
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={LABEL}>{t("apiGateway.stages.burst")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={burst}
                  onChange={(e) => {
                    setBurst(e.target.value)
                  }}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{t("apiGateway.stages.throttleHelp")}</p>

            <div className="space-y-1.5">
              <Label className={LABEL}>{t("apiGateway.stages.logging")}</Label>
              <Select
                value={logging}
                onValueChange={(v) => {
                  setLogging(v as LoggingLevel)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOGGING_LEVEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-4">
              <Label className="text-sm">{t("apiGateway.stages.detailedMetrics")}</Label>
              <Switch checked={metrics} onCheckedChange={setMetrics} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label className="text-sm">{t("apiGateway.stages.dataTrace")}</Label>
              <Switch checked={dataTrace} onCheckedChange={setDataTrace} />
            </div>

            <div className="space-y-3 glass-1 p-3">
              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm">{t("apiGateway.stages.accessLog")}</Label>
                <Switch checked={accessLog} onCheckedChange={setAccessLog} />
              </div>
              {accessLog && (
                <>
                  <Input
                    value={accessLogDestination}
                    placeholder={t("apiGateway.stages.accessLogDestination")}
                    onChange={(e) => {
                      setAccessLogDestination(e.target.value)
                    }}
                  />
                  <Input
                    className="font-mono text-xs"
                    value={accessLogFormat}
                    placeholder={t("apiGateway.stages.accessLogFormat")}
                    onChange={(e) => {
                      setAccessLogFormat(e.target.value)
                    }}
                  />
                </>
              )}
            </div>

            <KeyValueEditor
              title={t("apiGateway.stages.variables")}
              help={t("apiGateway.stages.variablesHelp")}
              rows={variables}
              onChange={setVariables}
              addLabel={t("apiGateway.stages.addVariable")}
              removeLabel={t("apiGateway.stages.removeVariable")}
            />

            <div className="space-y-2">
              <p className="text-sm font-medium">{t("apiGateway.stages.overrides")}</p>
              <p className="text-xs text-muted-foreground">
                {t("apiGateway.stages.overridesHelp")}
              </p>
              {overrides.map((row, index) => (
                <div
                  key={`${row.routeKey}-${String(index)}`}
                  className="grid items-end gap-2 glass-1 p-2 lg:grid-cols-[1fr_90px_90px_120px_auto]"
                >
                  <Select
                    value={row.routeKey}
                    onValueChange={(v) => {
                      setOverrides((prev) =>
                        prev.map((r, i) => (i === index ? { ...r, routeKey: v } : r)),
                      )
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("apiGateway.stages.selectRoute")} />
                    </SelectTrigger>
                    <SelectContent>
                      {routes.map((route) => (
                        <SelectItem key={route.id} value={route.route_key}>
                          {route.route_key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    value={row.rate}
                    placeholder={t("apiGateway.stages.inherit")}
                    onChange={(e) => {
                      setOverrides((prev) =>
                        prev.map((r, i) => (i === index ? { ...r, rate: e.target.value } : r)),
                      )
                    }}
                  />
                  <Input
                    type="number"
                    min={0}
                    value={row.burst}
                    placeholder={t("apiGateway.stages.inherit")}
                    onChange={(e) => {
                      setOverrides((prev) =>
                        prev.map((r, i) => (i === index ? { ...r, burst: e.target.value } : r)),
                      )
                    }}
                  />
                  <Select
                    value={row.logging}
                    onValueChange={(v) => {
                      setOverrides((prev) =>
                        prev.map((r, i) =>
                          i === index ? { ...r, logging: v as LoggingLevel | "INHERIT" } : r,
                        ),
                      )
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INHERIT">{t("apiGateway.stages.inherit")}</SelectItem>
                      {LOGGING_LEVEL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("apiGateway.stages.removeOverride")}
                    onClick={() => {
                      setOverrides((prev) => prev.filter((_, i) => i !== index))
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOverrides((prev) => [
                    ...prev,
                    { routeKey: "", rate: "", burst: "", logging: "INHERIT" },
                  ])
                }}
              >
                <Plus className="size-3.5" />
                {t("apiGateway.stages.addOverride")}
              </Button>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("console.wizard.cancel")}
          </Button>
          <Button
            variant="gold"
            loading={pending}
            disabled={pending || (!stage && !name)}
            onClick={submit}
          >
            {t("apiGateway.common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** A small ordered key/value editor, used for stage variables. */
function KeyValueEditor({
  title,
  help,
  rows,
  onChange,
  addLabel,
  removeLabel,
}: Readonly<{
  title: string
  help: string
  rows: VariableRow[]
  onChange: (rows: VariableRow[]) => void
  addLabel: string
  removeLabel: string
}>) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{help}</p>
      {rows.map((row, index) => (
        <div key={`${row.key}-${String(index)}`} className="flex items-center gap-2">
          <Input
            className="font-mono"
            value={row.key}
            onChange={(e) => {
              onChange(rows.map((r, i) => (i === index ? { ...r, key: e.target.value } : r)))
            }}
          />
          <Input
            value={row.value}
            onChange={(e) => {
              onChange(rows.map((r, i) => (i === index ? { ...r, value: e.target.value } : r)))
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label={removeLabel}
            onClick={() => {
              onChange(rows.filter((_, i) => i !== index))
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          onChange([...rows, { key: "", value: "" }])
        }}
      >
        <Plus className="size-3.5" />
        {addLabel}
      </Button>
    </div>
  )
}
