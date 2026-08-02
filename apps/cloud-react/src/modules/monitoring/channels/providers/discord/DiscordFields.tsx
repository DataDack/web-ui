import { useTranslation } from "react-i18next"
import { Input } from "@datadack/common-ui"
import type { UseFormReturn } from "react-hook-form"

import type { ChannelFormValues } from "../../channels.form"
import { FieldError, FieldLabel } from "../../components/FormFields"

export function DiscordFields({ form }: Readonly<{ form: UseFormReturn<ChannelFormValues> }>) {
  const { t } = useTranslation()
  const {
    register,
    formState: { errors },
  } = form

  return (
    <div className="space-y-1.5">
      <FieldLabel>{t("monitoring.discordFields.webhookUrl")}</FieldLabel>
      <Input
        {...register("discordWebhookUrl")}
        placeholder="https://discord.com/api/webhooks/..."
        className="font-mono text-[13px]"
        autoComplete="off"
      />
      <FieldError message={errors.discordWebhookUrl?.message} />
    </div>
  )
}
