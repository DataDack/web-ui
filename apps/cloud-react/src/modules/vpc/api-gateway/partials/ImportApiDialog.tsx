import { useMemo, useState } from "react"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  JsonCodeEditor,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { z } from "zod/v4"

import { useRegions } from "../../vpc.hooks"
import { APIGW_ROUTES } from "../apigw.constants"
import { useImportAPI } from "../apigw.hooks"

const schema = z.object({
  region: z.string().min(1, "Required"),
  name: z.string(),
  body: z.string().min(2, "Enter an OpenAPI document"),
  fail_on_warnings: z.boolean(),
})
type Values = z.infer<typeof schema>
const LABEL = "text-xs font-semibold tracking-wide uppercase text-muted-foreground"
export function ImportApiDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: regions = [] } = useRegions()
  const { mutate: importApi, isPending } = useImportAPI()
  const [warnings, setWarnings] = useState<string[]>([])
  const defaults = useMemo(
    () => ({ region: "", name: "", body: '{\n  "openapi": "3.0.0"\n}', fail_on_warnings: true }),
    [],
  )
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults })
  const close = (value: boolean) => {
    if (!value) {
      form.reset(defaults)
      setWarnings([])
    }
    onOpenChange(value)
  }
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="glass-3 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("apiGateway.import.title")}</DialogTitle>
          <DialogDescription>{t("apiGateway.import.description")}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={(e) =>
            void form.handleSubmit((v) => {
              importApi(
                { ...v, name: v.name || undefined },
                {
                  onSuccess: (api) => {
                    const result = api as typeof api & { warnings?: string[] }
                    if (result.warnings?.length) setWarnings(result.warnings)
                    else void navigate(APIGW_ROUTES.detail(api.id))
                  },
                },
              )
            })(e)
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={LABEL}>{t("apiGateway.import.region")} *</Label>
              <Controller
                control={form.control}
                name="region"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("apiGateway.import.regionPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((r) => (
                        <SelectItem value={r.code} key={r.code}>
                          {r.code} — {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={form.formState.errors.region?.message} />
            </div>
            <div className="space-y-1.5">
              <Label className={LABEL}>{t("apiGateway.import.name")}</Label>
              <Input
                {...form.register("name")}
                placeholder={t("apiGateway.import.namePlaceholder")}
              />
              <FieldError message={form.formState.errors.name?.message} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className={LABEL}>{t("apiGateway.import.document")} *</Label>
            <Controller
              control={form.control}
              name="body"
              render={({ field }) => (
                <JsonCodeEditor value={field.value} onChange={field.onChange} minHeight="260px" />
              )}
            />
            <FieldError message={form.formState.errors.body?.message} />
          </div>
          <Controller
            control={form.control}
            name="fail_on_warnings"
            render={({ field }) => (
              <div className="flex items-center justify-between gap-4 rounded-md border border-border/60 p-3">
                <Label>{t("apiGateway.import.failOnWarnings")}</Label>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </div>
            )}
          />
          {warnings.length > 0 && (
            <div
              role="alert"
              className="rounded-md border border-status-warning/40 bg-status-warning/5 p-3"
            >
              <p className="text-sm font-medium">{t("apiGateway.import.warnings")}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                close(false)
              }}
            >
              {t("console.wizard.cancel")}
            </Button>
            <Button type="submit" variant="gold" loading={isPending}>
              {t("apiGateway.import.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
function FieldError({ message }: Readonly<{ message?: string }>) {
  return message ? <p className="text-[11px] text-destructive">{message}</p> : null
}
