import { useMemo, useState } from "react"

import { Check, RefreshCw, RotateCcw, ScrollText, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { EmptyState, PageHeader, Section } from "@/components/console"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/modules/auth/auth.context"
import { ORG_MANAGER_ROLES } from "@/modules/organizations/organizations.constants"
import { useActiveOrganization } from "@/modules/organizations/organizations.hooks"
import { useScreen } from "@/services/api/screen"

import { Badge, Skeleton } from "@datadack/serverless-ui"

import { useNamingPolicy, useUpdateNamingPolicy } from "../governance.hooks"
import {
  builderToPattern,
  DEFAULT_BUILDER,
  describePattern,
  NAMING_PRESETS,
  patternToBuilder,
  presetForPattern,
  validatePattern,
  type LetterCase,
  type NamingBuilder,
  type NamingPreset,
} from "../naming-convention"

/** Toggle rows shown in the builder, in display order. */
const TOGGLES: { key: keyof NamingBuilder; labelKey: string }[] = [
  { key: "digits", labelKey: "naming.fields.digits" },
  { key: "hyphen", labelKey: "naming.fields.hyphen" },
  { key: "underscore", labelKey: "naming.fields.underscore" },
  { key: "dot", labelKey: "naming.fields.dot" },
  { key: "space", labelKey: "naming.fields.space" },
]

export function NamingConventionsPage() {
  useScreen("governance.naming-conventions")
  const { t } = useTranslation()
  const { user } = useAuth()
  const { activeOrg } = useActiveOrganization()
  const { data, isLoading, isError, refetch, isFetching } = useNamingPolicy()
  const { mutate: save, isPending: isSaving } = useUpdateNamingPolicy()

  const [draft, setDraft] = useState<string | null>(null)

  // Org authority comes from the caller's membership role (owner/admin), not the
  // flat user role — every owner carries the flat "user" role. The platform
  // super admin may always edit.
  const canEdit =
    user?.is_super_admin === true || ORG_MANAGER_ROLES.includes(activeOrg?.member_role ?? "")

  const saved = data?.namingConvention ?? ""
  const working = draft ?? saved
  const restricted = working.trim() !== ""
  const dirty = draft !== null && draft !== saved

  const builder = useMemo(() => patternToBuilder(working), [working])
  const activePreset = useMemo(() => presetForPattern(working), [working])

  const setRestricted = (on: boolean) => {
    setDraft(on ? builderToPattern(DEFAULT_BUILDER) : "")
  }
  const selectPreset = (p: NamingPreset) => {
    setDraft(builderToPattern(p.builder))
  }
  const patchBuilder = (patch: Partial<NamingBuilder>) => {
    setDraft(builderToPattern({ ...(builder ?? DEFAULT_BUILDER), ...patch }))
  }
  const reset = () => {
    setDraft(null)
  }

  const submit = () => {
    if (restricted) {
      try {
        new RegExp(working)
      } catch {
        toast.error(t("naming.toasts.invalidPattern"))
        return
      }
    }
    save(working, {
      onSuccess: () => {
        setDraft(null)
      },
    })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ScrollText}
        breadcrumbs={[{ label: t("console.nav.groups.governance") }, { label: t("naming.title") }]}
        title={t("naming.title")}
        description={t("naming.subtitle")}
        meta={
          data ? (
            <Badge variant={data.isDefault ? "outline" : "secondary"}>
              {data.isDefault ? t("naming.badges.default") : t("naming.badges.custom")}
            </Badge>
          ) : undefined
        }
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void refetch()}
              disabled={isFetching}
              aria-label={t("common.refresh")}
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            {canEdit && dirty && (
              <Button variant="ghost" className="gap-1.5" onClick={reset} disabled={isSaving}>
                <RotateCcw className="size-3.5" />
                {t("naming.actions.reset")}
              </Button>
            )}
            {canEdit && (
              <Button onClick={submit} disabled={!dirty || isSaving}>
                {isSaving ? t("naming.actions.saving") : t("naming.actions.save")}
              </Button>
            )}
          </>
        }
      />

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!isLoading && isError && (
        <EmptyState
          icon={X}
          title={t("naming.loadError")}
          action={{ label: t("common.refresh"), onClick: () => void refetch() }}
        />
      )}

      {!isLoading && !isError && (
        <>
          <CurrentConvention pattern={working} />

          {canEdit && (
            <Section variant="panel" className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="naming-restrict" className="text-[13px] font-medium">
                    {t("naming.restrict.label")}
                  </Label>
                  <p className="text-[12px] text-muted-foreground">{t("naming.restrict.hint")}</p>
                </div>
                <Switch id="naming-restrict" checked={restricted} onCheckedChange={setRestricted} />
              </div>
            </Section>
          )}

          {canEdit && restricted && (
            <>
              <PresetPicker activeId={activePreset?.id ?? null} onSelect={selectPreset} />
              <BuilderPanel builder={builder} onChange={patchBuilder} />
              <AdvancedPattern
                value={working}
                onChange={(v) => {
                  setDraft(v)
                }}
              />
            </>
          )}

          {!canEdit && (
            <p className="px-1 text-[12px] text-muted-foreground">{t("naming.readOnlyHint")}</p>
          )}
          <p className="px-1 text-[12px] leading-relaxed text-muted-foreground">
            {t("naming.footnote")}
          </p>
        </>
      )}
    </div>
  )
}

/** Read-only summary of the active convention plus a live name tester. */
function CurrentConvention({ pattern }: Readonly<{ pattern: string }>) {
  const { t } = useTranslation()
  const [sample, setSample] = useState("")
  const restricted = pattern.trim() !== ""
  const error = sample ? validatePattern(pattern, sample) : null
  const ok = sample.length > 0 && error === null

  return (
    <Section variant="panel" title={t("naming.current.title")} className="space-y-3">
      {restricted ? (
        <>
          <p className="text-[13px] text-muted-foreground">{describePattern(pattern)}</p>
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="text-muted-foreground">{t("naming.current.patternLabel")}</span>
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]">{pattern}</code>
          </div>
        </>
      ) : (
        <p className="text-[13px] text-muted-foreground">{t("naming.current.allowAny")}</p>
      )}

      <div className="max-w-sm space-y-1.5">
        <Label htmlFor="naming-test" className="text-[12px]">
          {t("naming.test.label")}
        </Label>
        <div className="relative">
          <Input
            id="naming-test"
            value={sample}
            onChange={(e) => {
              setSample(e.target.value)
            }}
            placeholder={t("naming.test.placeholder")}
            className="h-8 pr-8 font-mono text-[13px]"
          />
          {sample && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
              {ok ? (
                <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <X className="size-4 text-destructive" />
              )}
            </span>
          )}
        </div>
        {sample && (
          <p
            className={`text-[12px] ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
          >
            {ok ? t("naming.test.valid") : error}
          </p>
        )}
      </div>
    </Section>
  )
}

/** Preset cards — the no-regex path most admins will use. */
function PresetPicker({
  activeId,
  onSelect,
}: Readonly<{ activeId: string | null; onSelect: (p: NamingPreset) => void }>) {
  const { t } = useTranslation()
  return (
    <Section variant="panel" title={t("naming.edit.presetsTitle")}>
      <div className="grid gap-2 sm:grid-cols-2">
        {NAMING_PRESETS.map((p) => {
          const active = p.id === activeId
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelect(p)
              }}
              aria-pressed={active}
              className={`rounded-lg border p-3 text-left transition-colors ${
                active
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium text-foreground">{p.label}</span>
                {active && <Check className="size-4 text-primary" />}
              </div>
              <p className="mt-0.5 text-[12px] text-muted-foreground">{p.description}</p>
              <code className="mt-1.5 inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                {p.example}
              </code>
            </button>
          )
        })}
      </div>
    </Section>
  )
}

const CASE_OPTIONS: { value: LetterCase; labelKey: string }[] = [
  { value: "lower", labelKey: "naming.fields.case.lower" },
  { value: "upper", labelKey: "naming.fields.case.upper" },
  { value: "mixed", labelKey: "naming.fields.case.mixed" },
]

/** Fine-grained selector: case, allowed characters, start rule and length. Every
 * change regenerates the regex. */
function BuilderPanel({
  builder,
  onChange,
}: Readonly<{ builder: NamingBuilder | null; onChange: (patch: Partial<NamingBuilder>) => void }>) {
  const { t } = useTranslation()
  const b = builder ?? DEFAULT_BUILDER
  const isCustom = builder === null

  return (
    <Section variant="panel" title={t("naming.edit.customTitle")} className="space-y-4">
      {isCustom && (
        <p className="text-[12px] text-amber-600 dark:text-amber-400">
          {t("naming.edit.customActive")}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[12px]">{t("naming.fields.letterCase")}</Label>
          <Select
            value={b.letterCase}
            onValueChange={(v) => {
              onChange({ letterCase: v as LetterCase })
            }}
          >
            <SelectTrigger className="h-8 text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CASE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {t(o.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="naming-min" className="text-[12px]">
              {t("naming.fields.minLength")}
            </Label>
            <Input
              id="naming-min"
              type="number"
              min={1}
              value={b.minLength}
              onChange={(e) => {
                onChange({ minLength: Number(e.target.value) })
              }}
              className="h-8 text-[13px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="naming-max" className="text-[12px]">
              {t("naming.fields.maxLength")}
            </Label>
            <Input
              id="naming-max"
              type="number"
              min={1}
              value={b.maxLength}
              onChange={(e) => {
                onChange({ maxLength: Number(e.target.value) })
              }}
              className="h-8 text-[13px]"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {TOGGLES.map((tg) => (
          <div key={tg.key} className="flex items-center justify-between">
            <Label htmlFor={`naming-${tg.key}`} className="text-[13px] font-normal">
              {t(tg.labelKey)}
            </Label>
            <Switch
              id={`naming-${tg.key}`}
              checked={Boolean(b[tg.key])}
              onCheckedChange={(v) => {
                onChange({ [tg.key]: v })
              }}
            />
          </div>
        ))}
        <div className="flex items-center justify-between border-t pt-2.5">
          <Label htmlFor="naming-startsWithLetter" className="text-[13px] font-normal">
            {t("naming.fields.startsWithLetter")}
          </Label>
          <Switch
            id="naming-startsWithLetter"
            checked={b.startsWithLetter}
            onCheckedChange={(v) => {
              onChange({ startsWithLetter: v })
            }}
          />
        </div>
      </div>
    </Section>
  )
}

/** Escape hatch for power users who want to write the regex by hand. */
function AdvancedPattern({
  value,
  onChange,
}: Readonly<{ value: string; onChange: (v: string) => void }>) {
  const { t } = useTranslation()
  let valid = true
  try {
    new RegExp(value)
  } catch {
    valid = false
  }
  return (
    <Section variant="panel" title={t("naming.edit.advancedTitle")} className="space-y-1.5">
      <p className="text-[12px] text-muted-foreground">{t("naming.edit.advancedHint")}</p>
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
        }}
        spellCheck={false}
        className={`h-8 font-mono text-[13px] ${valid ? "" : "border-destructive"}`}
        aria-invalid={!valid}
      />
      {!valid && <p className="text-[12px] text-destructive">{t("naming.edit.invalidPattern")}</p>}
    </Section>
  )
}
