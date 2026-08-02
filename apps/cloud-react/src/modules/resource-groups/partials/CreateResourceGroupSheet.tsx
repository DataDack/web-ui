import { useMemo, useState } from "react"

import {
  Button,
  Input,
  Label,
  ScrollArea,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
} from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Tag, Trash2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import { useNamingRule } from "@/modules/governance/governance.hooks"
import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"

import { useCreateResourceGroup } from "../resource-groups.hooks"
import type { CreateResourceGroupPayload, ResourceGroup } from "../resource-groups.types"

/* ── Schema ─────────────────────────────────────────────────────────── */

const makeSchema = (rule: NamingRule) =>
  z.object({
    name: namingNameSchema(rule),
    description: z.string().max(500, "Maximum 500 characters"),
  })

type FormValues = z.infer<ReturnType<typeof makeSchema>>

interface TagRow {
  key: string
  value: string
}

/* ── Component ─────────────────────────────────────────────────────── */

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with the freshly created group, e.g. to select it inline. */
  onCreated?: (rg: ResourceGroup) => void
}

export function CreateResourceGroupSheet({ open, onOpenChange, onCreated }: Readonly<Props>) {
  const { t } = useTranslation()
  const [tags, setTags] = useState<TagRow[]>([{ key: "", value: "" }])
  const { mutate: create, isPending } = useCreateResourceGroup()
  const { rule } = useNamingRule("resource-group")
  const schema = useMemo(() => makeSchema(rule), [rule])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { description: "" },
  })

  const close = () => {
    reset()
    setTags([{ key: "", value: "" }])
    onOpenChange(false)
  }

  const onSubmit = (values: FormValues) => {
    const tagRecord: Record<string, string> = {}
    for (const t of tags) {
      if (t.key.trim()) tagRecord[t.key.trim()] = t.value.trim()
    }
    const payload: CreateResourceGroupPayload = { ...values, tags: tagRecord }
    create(payload, {
      onSuccess: (rg) => {
        onCreated?.(rg)
        close()
      },
    })
  }

  const addTag = () => {
    setTags((prev) => [...prev, { key: "", value: "" }])
  }
  const removeTag = (idx: number) => {
    setTags((prev) => prev.filter((_, i) => i !== idx))
  }
  const updateTag = (idx: number, field: "key" | "value", val: string) => {
    setTags((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: val } : t)))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[480px] p-0 flex flex-col gap-0">
        <SheetHeader className="px-6 py-5 shrink-0">
          <SheetTitle>{t("resourceGroups.form.title")}</SheetTitle>
          <SheetDescription>{t("resourceGroups.form.subtitle")}</SheetDescription>
        </SheetHeader>

        <Separator />

        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <ScrollArea className="flex-1 px-6 py-5">
            <div className="space-y-5 pr-1">
              {/* Name */}
              <FormField
                label={t("resourceGroups.form.name")}
                required
                error={errors.name?.message}
                hint={t("resourceGroups.form.nameHint")}
              >
                <Input
                  {...register("name")}
                  placeholder="my-resource-group"
                  className="font-mono"
                />
              </FormField>

              {/* Description */}
              <FormField
                label={t("resourceGroups.form.description")}
                error={errors.description?.message}
              >
                <Textarea
                  {...register("description")}
                  placeholder="Describe the purpose of this resource group..."
                  rows={3}
                  className="resize-none"
                />
              </FormField>

              {/* Tags */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                    <Tag className="w-3.5 h-3.5" />
                    {t("resourceGroups.form.tags")}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addTag}
                    className="h-7 gap-1 text-xs text-muted-foreground"
                  >
                    <Plus className="w-3 h-3" />
                    {t("resourceGroups.form.addTag")}
                  </Button>
                </div>
                <div className="space-y-2">
                  {tags.map((tag, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={tag.key}
                        onChange={(e) => {
                          updateTag(i, "key", e.target.value)
                        }}
                        placeholder="key"
                        className="font-mono flex-1"
                      />
                      <span className="text-muted-foreground text-sm">=</span>
                      <Input
                        value={tag.value}
                        onChange={(e) => {
                          updateTag(i, "value", e.target.value)
                        }}
                        placeholder="value"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          removeTag(i)
                        }}
                        disabled={tags.length === 1}
                        className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <Separator />

          <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0">
            <Button type="button" variant="ghost" onClick={close}>
              {t("resourceGroups.form.cancel")}
            </Button>
            <Button type="submit" variant="gold" disabled={isPending} loading={isPending}>
              {isPending ? t("resourceGroups.form.creating") : t("resourceGroups.form.create")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

/* ── Field wrapper ─────────────────────────────────────────────────── */

function FormField({
  label,
  error,
  required,
  hint,
  children,
}: Readonly<{
  label: string
  error?: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}>) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  )
}
