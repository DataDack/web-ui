import { useEffect, useMemo, useState } from "react"

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
} from "@datadack/common-ui"
import { useTranslation } from "react-i18next"

import { useCreateModel, useUpdateModel } from "../apigw.hooks"
import type { APIGatewayModel } from "../apigw.types"

const EMPTY_SCHEMA = '{\n  "type": "object"\n}'
export function ModelDialog({
  apiId,
  model,
  open,
  onClose,
}: Readonly<{ apiId: string; model: APIGatewayModel | null; open: boolean; onClose: () => void }>) {
  const { t } = useTranslation(),
    create = useCreateModel(),
    update = useUpdateModel()
  const [name, setName] = useState(""),
    [description, setDescription] = useState(""),
    [contentType, setContentType] = useState("application/json"),
    [schema, setSchema] = useState(EMPTY_SCHEMA)
  useEffect(() => {
    if (!open) return
    setName(model?.name ?? "")
    setDescription(model?.description ?? "")
    setContentType(model?.content_type ?? "application/json")
    setSchema(model?.schema ?? EMPTY_SCHEMA)
  }, [open, model])
  const schemaError = useMemo(() => {
    try {
      JSON.parse(schema)
      return ""
    } catch (error) {
      return error instanceof Error ? error.message : t("apiGateway.models.invalidSchema")
    }
  }, [schema, t])
  const pending = create.isPending || update.isPending
  const submit = () => {
    if (schemaError) return
    const payload = { name, description, content_type: contentType, schema }
    if (model) update.mutate({ apiId, modelId: model.id, payload }, { onSuccess: onClose })
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
            {t(model ? "apiGateway.models.editTitle" : "apiGateway.models.createTitle")}
          </DialogTitle>
          <DialogDescription>{t("apiGateway.models.dialogDescription")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label={t("apiGateway.models.name")}>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
            />
          </Field>
          <Field label={t("apiGateway.models.description")}>
            <Input
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
              }}
            />
          </Field>
          <Field label={t("apiGateway.models.contentType")}>
            <Input
              value={contentType}
              onChange={(e) => {
                setContentType(e.target.value)
              }}
            />
          </Field>
          <Field label={t("apiGateway.models.schema")}>
            <JsonCodeEditor value={schema} onChange={setSchema} minHeight="260px" />
            {schemaError && (
              <p role="alert" className="text-xs text-destructive">
                {schemaError}
              </p>
            )}
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("apiGateway.common.cancel")}
          </Button>
          <Button
            variant="gold"
            disabled={pending || !name.trim() || !contentType.trim() || !!schemaError}
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
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}
