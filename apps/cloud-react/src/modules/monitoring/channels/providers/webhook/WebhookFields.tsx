import { ShieldCheck } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"

import { Input } from "@/components/ui/input"

import type { ChannelFormValues } from "../../channels.form"
import { FieldError, FieldLabel } from "../../components/FormFields"

export function WebhookFields({ form }: Readonly<{ form: UseFormReturn<ChannelFormValues> }>) {
  const {
    register,
    watch,
    formState: { errors },
  } = form
  const webhookSecret = watch("webhookSecret")

  return (
    <>
      <div className="space-y-1.5">
        <FieldLabel>URL</FieldLabel>
        <Input
          {...register("webhookUrl")}
          placeholder="https://example.com/hooks/alerts"
          className="font-mono text-[13px]"
          autoComplete="off"
        />
        <FieldError message={errors.webhookUrl?.message} />
      </div>
      <div className="space-y-1.5">
        <FieldLabel required={false}>Secret</FieldLabel>
        <Input
          {...register("webhookSecret")}
          type="password"
          placeholder="optional signing secret"
          autoComplete="off"
        />
        {webhookSecret?.trim() ? (
          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="mt-px size-3.5 shrink-0" />
            <span>
              Requests include <code className="font-mono">X-DataDack-Signature</code> and{" "}
              <code className="font-mono">X-DataDack-Timestamp</code>.
            </span>
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">Leave empty for an unsigned webhook.</p>
        )}
      </div>
    </>
  )
}
