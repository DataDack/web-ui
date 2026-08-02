import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@datadack/common-ui"
import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import type { StoragePriceOption } from "@/modules/catalog/catalog.types"

import { formatPrice } from "./wizard.format"
import { FieldLabel, FieldError } from "./wizard.shared"
import type { FormValues } from "./wizard.types"

export function DiskStep({
  form,
  storageOptions,
}: Readonly<{ form: UseFormReturn<FormValues>; storageOptions: StoragePriceOption[] }>) {
  const { t } = useTranslation()
  const sizeGb = form.watch("disk_size_gb")

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <FieldLabel>{t("vms.wizard.dataDiskSize")} *</FieldLabel>
          <Input
            type="number"
            min={10}
            className="font-mono"
            value={Number.isFinite(sizeGb) ? String(sizeGb) : ""}
            onChange={(e) => {
              const next = e.target.value === "" ? Number.NaN : Number(e.target.value)
              form.setValue("disk_size_gb", next, {
                shouldValidate: form.formState.isSubmitted,
              })
            }}
            onBlur={() => void form.trigger("disk_size_gb")}
          />
          <p className="text-[11px] text-muted-foreground">
            {t("vms.diskStep.first30GbIncludedFreeExtraGbBilledAtThePerGb")}
          </p>
          <FieldError message={form.formState.errors.disk_size_gb?.message} />
        </div>

        <div className="space-y-1.5">
          <FieldLabel>{t("vms.diskStep.volumeClass")}</FieldLabel>
          <Select
            value={form.watch("disk_type")}
            onValueChange={(value) => {
              // Options are catalog storage offerings keyed by storage_type;
              // drive disk_type (which the cost summary prices off) and carry
              // the precise SKU through volume_class.
              const opt = storageOptions.find((o) => o.storage_type === value)
              form.setValue("disk_type", value as FormValues["disk_type"], {
                shouldValidate: true,
              })
              form.setValue("volume_class", opt?.sku ?? "", { shouldValidate: true })
            }}
            disabled={storageOptions.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("vms.diskStep.selectAStorageClass")} />
            </SelectTrigger>
            <SelectContent>
              {storageOptions.map((o) => (
                <SelectItem key={o.id} value={o.storage_type}>
                  {o.name} · {formatPrice(o.price_per_gb_month, o.currency)}/GB-mo
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={form.formState.errors.volume_class?.message} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border-glass max-w-sm">
        <div className="space-y-0.5">
          <Label>{t("vms.diskStep.deleteOnTermination")}</Label>
          <p className="text-xs text-muted-foreground">
            {t("vms.diskStep.automaticallyDeleteThisDataDiskWhenTheInstan")}
          </p>
        </div>
        <Switch
          checked={form.watch("delete_on_termination")}
          onCheckedChange={(checked) => {
            form.setValue("delete_on_termination", checked)
          }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">{t("vms.wizard.diskHint")}</p>
    </div>
  )
}
