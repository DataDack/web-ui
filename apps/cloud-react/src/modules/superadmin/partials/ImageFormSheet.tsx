import { useEffect, useRef, useState } from "react"

import { Switch, Textarea } from "@DataDack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import { Button, Input } from "@datadack/common-ui"
import { Field, FormSheet } from "../components/form-fields"
import { useSaveImage, useUploadImageIcon } from "../superadmin.hooks"
import type { CreateImageRequest, Image, UpdateImageRequest } from "../superadmin.types"

const schema = z.object({
  name: z.string().min(2, "Min 2 characters").max(64),
  display_name: z.string().min(2, "Min 2 characters").max(128),
  description: z.string().max(512),
  sort_order: z.coerce.number().int().min(0),
  is_active: z.boolean(),
  icon_url: z.union([z.literal(""), z.url("Enter a valid URL").max(512)]),
})

type FormValues = z.infer<typeof schema>

/** How the icon is supplied: upload a file, or link one that's already hosted. */
type IconMode = "upload" | "url"

const EMPTY: FormValues = {
  name: "",
  display_name: "",
  description: "",
  sort_order: 0,
  is_active: true,
  icon_url: "",
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  image?: Image | null
}

export function ImageFormSheet({ open, onOpenChange, image }: Readonly<Props>) {
  const { t } = useTranslation()
  const { mutate: save, isPending } = useSaveImage()
  const { mutate: uploadIcon, isPending: isUploading } = useUploadImageIcon()
  const isEdit = !!image

  const [iconMode, setIconMode] = useState<IconMode>("upload")
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof schema>, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  })

  const iconUrl = useWatch({ control, name: "icon_url" })

  useEffect(() => {
    if (open) {
      setFile(null)
      setIconMode("upload")
      if (fileInputRef.current) fileInputRef.current.value = ""
      reset(
        image
          ? {
              name: image.name,
              display_name: image.display_name,
              description: image.description,
              sort_order: image.sort_order,
              is_active: image.is_active,
              icon_url: "",
            }
          : EMPTY,
      )
    }
  }, [open, image, reset])

  const onSubmit = (values: FormValues) => {
    const description = values.description.length > 0 ? values.description : undefined
    // Only one icon source is sent: a URL is saved with the row, a file is
    // uploaded after the row exists (it needs the image id).
    const linkedIcon = iconMode === "url" && values.icon_url.length > 0
    const pendingFile = iconMode === "upload" ? file : null
    const body: CreateImageRequest | UpdateImageRequest = isEdit
      ? {
          display_name: values.display_name,
          description,
          sort_order: values.sort_order,
          is_active: values.is_active,
          ...(linkedIcon ? { icon_url: values.icon_url } : {}),
        }
      : {
          name: values.name,
          display_name: values.display_name,
          description,
          sort_order: values.sort_order,
          is_active: values.is_active,
        }
    save(
      { id: image?.id, payload: body },
      {
        onSuccess: (saved) => {
          if (pendingFile) {
            uploadIcon(
              { id: saved.id, file: pendingFile },
              {
                onSuccess: () => {
                  onOpenChange(false)
                },
              },
            )
          } else if (linkedIcon && !isEdit) {
            // Create can't carry an icon_url, so set it on the new row.
            save(
              { id: saved.id, payload: { icon_url: values.icon_url } },
              {
                onSuccess: () => {
                  onOpenChange(false)
                },
              },
            )
          } else {
            onOpenChange(false)
          }
        },
      },
    )
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t("superAdmin.images.editTitle") : t("superAdmin.images.createTitle")}
      description={t("superAdmin.images.formSubtitle")}
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
      submitting={isPending || isUploading}
      submitLabel={isEdit ? t("superAdmin.actions.save") : t("superAdmin.actions.create")}
    >
      <Field
        label={t("superAdmin.images.fields.name")}
        required
        error={errors.name?.message}
        hint={isEdit ? t("superAdmin.images.fields.nameLocked") : undefined}
      >
        <Input {...register("name")} placeholder="ubuntu" className="font-mono" disabled={isEdit} />
      </Field>
      <Field
        label={t("superAdmin.images.fields.displayName")}
        required
        error={errors.display_name?.message}
      >
        <Input {...register("display_name")} placeholder="Ubuntu" />
      </Field>
      <Field label={t("superAdmin.images.fields.description")} error={errors.description?.message}>
        <Textarea {...register("description")} rows={3} />
      </Field>
      <Field label={t("superAdmin.images.fields.sortOrder")} error={errors.sort_order?.message}>
        <Input type="number" min={0} {...register("sort_order")} />
      </Field>
      <Field
        label={t("superAdmin.images.fields.icon")}
        hint={
          iconMode === "url"
            ? t("superAdmin.images.fields.iconUrlHint")
            : t("superAdmin.images.fields.iconHint")
        }
        error={errors.icon_url?.message}
      >
        <div className="space-y-3">
          <div className="inline-flex rounded-lg border border-border-glass p-0.5">
            {(["upload", "url"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setIconMode(mode)
                }}
                aria-pressed={iconMode === mode}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  iconMode === mode
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode === "upload"
                  ? t("superAdmin.images.fields.iconUpload")
                  : t("superAdmin.images.fields.iconLink")}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {(() => {
              const preview = iconMode === "url" && iconUrl ? iconUrl : (image?.icon_url ?? "")
              const showPreview = preview && !(iconMode === "upload" && file)
              return showPreview ? (
                <img
                  src={preview}
                  alt=""
                  className="size-9 shrink-0 rounded-md border border-border-glass object-contain"
                />
              ) : null
            })()}
            {iconMode === "upload" ? (
              <>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null)
                  }}
                />
                {file && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ""
                    }}
                  >
                    {t("console.wizard.cancel")}
                  </Button>
                )}
              </>
            ) : (
              <Input
                {...register("icon_url")}
                placeholder="https://cdn.datadack.cloud/images/os/ubuntu.svg"
                inputMode="url"
              />
            )}
          </div>
        </div>
      </Field>
      <Controller
        control={control}
        name="is_active"
        render={({ field }) => (
          <div className="flex items-center justify-between rounded-lg border border-border-glass px-3.5 py-3">
            <div>
              <p className="text-sm font-medium">{t("superAdmin.fields.active")}</p>
              <p className="text-[11px] text-muted-foreground">
                {t("superAdmin.images.fields.activeHint")}
              </p>
            </div>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </div>
        )}
      />
    </FormSheet>
  )
}
