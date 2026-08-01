import { useCallback, useEffect, useMemo, useState } from "react"

import { Label } from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  AlertTriangle,
  ChevronDown,
  Globe,
  Lock,
  Minus,
  Network,
  Plus,
  Trash2,
  Waypoints,
} from "lucide-react"
import { Controller, useForm, type UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { z } from "zod/v4"

import {
  CidrInput,
  CreateWizard,
  PageHeader,
  TagEditor,
  type WizardStep,
} from "@/components/console"
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@datadack/common-ui"
import { tagRowsToRecord, type TagRow } from "@/lib/tags"
import { cn } from "@/lib/utils"
import { useRegionCatalog } from "@/modules/catalog/catalog.hooks"
import type { AvailabilityZoneBrief } from "@/modules/catalog/catalog.types"
import { QuotaNotice, useQuotaBlocked } from "@/modules/governance/components/QuotaNotice"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import type { NamingRule } from "@/modules/governance/governance.types"
import { validatePattern } from "@/modules/governance/naming-convention"
import { RGField } from "@/modules/resource-groups/components/RGField"
import { useResourceGroups } from "@/modules/resource-groups/resource-groups.hooks"
import { useScreen } from "@/services/api/screen"

import { VPC_ROUTES } from "../vpc.constants"
import { useCreateVPC, useRegions } from "../vpc.hooks"
import {
  autoSubnetName,
  autoVpcName,
  carveSubnets,
  cidrRange,
  formatIpCount,
  nextFreeSubnetCidr,
  subnetCidrIssue,
  SUBNET_PREFIX_OPTIONS,
  VPC_PREFIX_OPTIONS,
  vpcCidrIssue,
  type SubnetCidrIssue,
  type VpcCidrIssue,
} from "../vpc.utils"
import { VpcResourceMap, type ResourceMapSubnet } from "./VpcResourceMap"

// Messages for each VPC CIDR rule violation (kept flat to avoid nested ternaries).
const VPC_CIDR_MESSAGES: Record<VpcCidrIssue, string> = {
  format: "Must be CIDR notation, e.g. 10.0.0.0/16",
  private: "Must be a private RFC1918 range (10.x, 172.16–31.x, 192.168.x)",
  prefix: "Prefix must be between /16 and /24",
}

const makeSchema = (rule: NamingRule) =>
  z.object({
    // Name is optional — leave it blank to auto-generate one (AWS-style). When
    // provided it must still satisfy the org naming convention.
    name: z.string().superRefine((value, ctx) => {
      if (value.trim() === "") return
      const err = validatePattern(rule.pattern, value)
      if (err) ctx.addIssue({ code: "custom", message: err })
    }),
    region: z.string().min(1, "Required"),
    resource_group_id: z.string().min(1, "Select a resource group"),
    // VPC CIDR must be a private (RFC1918) /16–/24. The shared validator keeps
    // the rule in one place; map its code to a human message here.
    cidr: z.string().superRefine((value, ctx) => {
      const issue = vpcCidrIssue(value)
      if (!issue) return
      ctx.addIssue({ code: "custom", message: VPC_CIDR_MESSAGES[issue] })
    }),
  })

type FormValues = z.infer<ReturnType<typeof makeSchema>>

type SubnetDraft = ResourceMapSubnet

const MAX_AZ = 3
const MAX_SUBNETS_PER_AZ = 4
// eslint-disable-next-line sonarjs/no-hardcoded-ip -- sensible starting block
const VPC_CIDR_DEFAULT = "10.0.0.0/16"

export function VpcCreateWizardPage() {
  useScreen("vpc.vpc-create-wizard")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { mutateAsync: createVPC, isPending } = useCreateVPC()
  const quotaBlocked = useQuotaBlocked("vpc.networks")
  // NOTE: do NOT default these with `= []`. While the query has no data the
  // default would mint a fresh array every render, which cascades through the
  // availableZones/azCodes memos into the carve effect below and re-fires it on
  // every render → "maximum update depth exceeded" (React #185). Keep the raw
  // (possibly undefined) reference stable and coalesce to [] at the use sites.
  const { data: catalog } = useRegionCatalog()
  const { data: resourceGroups } = useResourceGroups()

  const [tagRows, setTagRows] = useState<TagRow[]>([{ key: "", value: "" }])
  const [azCount, setAzCount] = useState(2)
  const [publicPerAz, setPublicPerAz] = useState(1)
  const [privatePerAz, setPrivatePerAz] = useState(1)
  const [subnets, setSubnets] = useState<SubnetDraft[]>([])
  const [subnetError, setSubnetError] = useState<string>()
  // Once the user hand-edits the subnet list (add/remove a row, change an AZ,
  // visibility, name or CIDR) we stop auto-regenerating from the template, so
  // their layout survives. Touching a template knob (AZ count / per-AZ counts)
  // deliberately resets this and re-carves a fresh, symmetric default.
  const [manuallyEdited, setManuallyEdited] = useState(false)

  const { rule } = useNamingRule("vpc")
  const schema = useMemo(() => makeSchema(rule), [rule])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", region: "", resource_group_id: "", cidr: VPC_CIDR_DEFAULT },
    mode: "onTouched",
  })

  const region = form.watch("region")
  const cidr = form.watch("cidr")

  // Availability zones for the selected region (react-query data is referentially
  // stable, so these memos don't thrash the carve effect below).
  const availableZones = useMemo<AvailabilityZoneBrief[]>(() => {
    const rc = (catalog ?? []).find((r) => r.code === region)
    return (rc?.availability_zones ?? []).filter((z) => z.is_available)
  }, [catalog, region])

  const maxAz = Math.min(MAX_AZ, Math.max(1, availableZones.length || MAX_AZ))
  const azCodes = useMemo(
    () => availableZones.slice(0, azCount).map((z) => z.id),
    [availableZones, azCount],
  )

  // Keep the AZ count within what the region actually offers.
  useEffect(() => {
    if (azCount > maxAz) setAzCount(maxAz)
  }, [azCount, maxAz])

  // Re-carve from the template whenever a structural input changes — unless the
  // user has taken manual control of the list, in which case their layout is
  // preserved (out-of-range rows just surface as validation errors).
  useEffect(() => {
    if (manuallyEdited) return
    setSubnetError(undefined)
    const carved = carveSubnets({ vpcCidr: cidr, azCodes, publicPerAz, privatePerAz })
    setSubnets(carved.map((s, i) => ({ key: i, ...s })))
  }, [cidr, azCodes, publicPerAz, privatePerAz, manuallyEdited])

  // Template knobs (AZ count, per-AZ counts) drop manual mode and re-carve a
  // fresh symmetric default.
  const handleAzCount = (n: number) => {
    setManuallyEdited(false)
    setAzCount(n)
  }
  const handlePublicPerAz = (n: number) => {
    setManuallyEdited(false)
    setPublicPerAz(n)
  }
  const handlePrivatePerAz = (n: number) => {
    setManuallyEdited(false)
    setPrivatePerAz(n)
  }

  const updateSubnet = (key: number, patch: Partial<SubnetDraft>) => {
    setSubnetError(undefined)
    setManuallyEdited(true)
    setSubnets((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  // Append a public/private subnet on the next free, in-range, non-overlapping
  // block — distributed round-robin across the selected AZs.
  const addSubnet = (isPublic: boolean) => {
    setSubnetError(undefined)
    setManuallyEdited(true)
    setSubnets((rows) => {
      const last = rows.at(-1)
      const prefix = last ? Number.parseInt(last.cidr.split("/")[1] ?? "", 10) : undefined
      const newCidr =
        nextFreeSubnetCidr(
          cidr,
          rows.map((r) => r.cidr),
          prefix,
        ) ?? ""
      const tierCount = rows.filter((r) => r.is_public === isPublic).length
      const zonePool = azCodes.length > 0 ? azCodes : availableZones.map((z) => z.id)
      const zone = zonePool.length > 0 ? zonePool[tierCount % zonePool.length] : ""
      const key = rows.reduce((max, r) => Math.max(max, r.key), -1) + 1
      return [...rows, { key, name: "", cidr: newCidr, zone, is_public: isPublic }]
    })
  }

  const removeSubnet = (key: number) => {
    setSubnetError(undefined)
    setManuallyEdited(true)
    setSubnets((rows) => rows.filter((r) => r.key !== key))
  }

  // The rule violation (if any) for each subnet, keyed by row. A subnet is
  // checked against the VPC CIDR and every *other* subnet, so overlaps surface
  // on both rows. Drives the red borders and the inline alert in the step.
  const subnetIssues = useMemo(() => {
    const issues = new Map<number, SubnetCidrIssue | null>()
    for (const s of subnets) {
      const siblings = subnets.filter((o) => o.key !== s.key).map((o) => o.cidr)
      issues.set(s.key, subnetCidrIssue(cidr, s.cidr, siblings))
    }
    return issues
  }, [subnets, cidr])

  const validSubnets = useCallback(
    (rows: SubnetDraft[]) =>
      rows.filter(
        (s) =>
          Boolean(s.zone) &&
          subnetCidrIssue(
            cidr,
            s.cidr,
            rows.filter((o) => o.key !== s.key).map((o) => o.cidr),
          ) === null,
      ),
    [cidr],
  )

  const steps = useMemo<WizardStep<FormValues>[]>(
    () => [
      {
        id: "basics",
        title: t("vpc.wizard.basics"),
        description: t("vpc.wizard.basicsDescription"),
        fields: ["name", "region", "resource_group_id"],
        render: (f) => <BasicsStep form={f} />,
        reviewItems: (values) => [
          {
            label: t("vpc.columns.name"),
            value: values.name || t("vpc.wizard.previewAutoName"),
            mono: true,
          },
          { label: t("vpc.wizard.region"), value: values.region, mono: true },
          {
            label: t("resourceGroups.field.label"),
            value:
              (resourceGroups ?? []).find((g) => g.id === values.resource_group_id)?.name ??
              values.resource_group_id,
            mono: true,
          },
        ],
      },
      {
        id: "subnets",
        title: t("vpc.wizard.cidrAndSubnets"),
        description: t("vpc.wizard.cidrAndSubnetsDescription"),
        fields: ["cidr"],
        validate: () => {
          if (subnets.length === 0) {
            setSubnetError(t("vpc.wizard.subnetsRequired"))
            return false
          }
          // Block advancing while any subnet breaks a rule — the inline
          // borders already point at the offending rows.
          const hasIssue = subnets.some((s) => subnetIssues.get(s.key) != null)
          if (hasIssue || validSubnets(subnets).length === 0) {
            setSubnetError(t("vpc.wizard.subnetsInvalid"))
            return false
          }
          setSubnetError(undefined)
          return true
        },
        render: (f) => (
          <CidrAndSubnetsStep
            form={f}
            zones={availableZones}
            maxAz={maxAz}
            azCount={azCount}
            onAzCount={handleAzCount}
            publicPerAz={publicPerAz}
            onPublicPerAz={handlePublicPerAz}
            privatePerAz={privatePerAz}
            onPrivatePerAz={handlePrivatePerAz}
            subnets={subnets}
            onSubnetChange={updateSubnet}
            onAddSubnet={addSubnet}
            onRemoveSubnet={removeSubnet}
            subnetIssues={subnetIssues}
            error={subnetError}
          />
        ),
        reviewItems: (values) => {
          const valid = validSubnets(subnets)
          return [
            { label: t("vpc.columns.cidr"), value: values.cidr, mono: true },
            {
              label: t("vpc.wizard.subnets"),
              value: t("vpc.wizard.subnetsCount", {
                count: valid.length,
                public: valid.filter((s) => s.is_public).length,
                private: valid.filter((s) => !s.is_public).length,
              }),
              mono: true,
            },
          ]
        },
      },
      {
        id: "tags",
        title: t("console.tags.label"),
        description: t("vpc.wizard.tagsDescription"),
        fields: [],
        render: () => <TagEditor rows={tagRows} onChange={setTagRows} />,
        reviewItems: () => {
          const entries = Object.entries(tagRowsToRecord(tagRows))
          return [
            {
              label: t("console.tags.label"),
              value: entries.length > 0 ? entries.map(([k, v]) => `${k}=${v}`).join(", ") : "—",
              mono: true,
            },
          ]
        },
      },
    ],
    [
      t,
      tagRows,
      subnets,
      subnetIssues,
      subnetError,
      resourceGroups,
      availableZones,
      maxAz,
      azCount,
      publicPerAz,
      privatePerAz,
      validSubnets,
    ],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        icon={Network}
        breadcrumbs={[
          { label: t("console.nav.groups.networking") },
          { label: t("vpc.title"), to: VPC_ROUTES.ROOT },
          { label: t("vpc.create") },
        ]}
        title={t("vpc.create")}
        description={t("vpc.wizard.subtitle")}
      />

      <div className="mb-6 empty:hidden">
        <QuotaNotice code="vpc.networks" />
      </div>

      <CreateWizard<FormValues>
        steps={steps}
        form={form}
        submitLabel={t("vpc.wizard.submit")}
        isSubmitting={isPending}
        submitDisabled={quotaBlocked}
        aside={({ stepId }) => (
          <VpcResourceMap
            name={form.watch("name").trim()}
            cidr={cidr}
            region={region}
            subnets={subnets}
            zones={availableZones}
            // Nothing worth previewing until the CIDR & subnets are set.
            revealed={stepId !== "basics"}
          />
        )}
        onCancel={() => void navigate(VPC_ROUTES.ROOT)}
        onSubmit={(values) => {
          void (async () => {
            // Name is optional in the UI — fall back to an auto-generated
            // one so the backend (which requires a name) still succeeds.
            const vpcName = values.name.trim() || autoVpcName()
            // The VPC and all its subnets are created in a SINGLE request;
            // the backend persists them atomically and carves the subnets
            // onto the VPC's VNet once it is provisioned.
            const drafts = validSubnets(subnets)
            const network = await createVPC({
              ...values,
              name: vpcName,
              resource_group_id: values.resource_group_id,
              tags: JSON.stringify(tagRowsToRecord(tagRows)),
              subnets: drafts.map((s, i) => ({
                name: s.name.trim() || autoSubnetName(vpcName, s.is_public, i),
                cidr: s.cidr,
                zone: s.zone,
                is_public: s.is_public,
              })),
            })
            void navigate(VPC_ROUTES.detail(network.id))
          })()
        }}
      />
    </div>
  )
}

/* ── Shared field chrome ───────────────────────────────────────────────── */

function FieldError({ message }: Readonly<{ message?: string }>) {
  if (!message) return null
  return <p className="text-[11px] text-destructive">{message}</p>
}

function FieldLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
      {children}
    </Label>
  )
}

/* ── Step 1: Basics ────────────────────────────────────────────────────── */

function BasicsStep({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
  const { t } = useTranslation()
  const { data: regions, isLoading } = useRegions()
  const region = form.watch("region")

  // Preselect the first live region once the catalog loads (no hardcoded default).
  useEffect(() => {
    if (!region && regions?.length) {
      form.setValue("region", regions[0].code, { shouldValidate: true })
    }
  }, [region, regions, form])

  let regionPlaceholder = t("vpc.wizard.selectRegion")
  if (isLoading) regionPlaceholder = t("common.loading")
  else if (!regions?.length) regionPlaceholder = t("vpc.wizard.noRegions")

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <FieldLabel>{t("vpc.columns.name")}</FieldLabel>
        <Input {...form.register("name")} placeholder="my-vpc" className="font-mono" />
        <p className="text-[11px] text-muted-foreground">{t("vpc.wizard.nameOptionalHint")}</p>
        <FieldError message={form.formState.errors.name?.message} />
      </div>

      <div className="space-y-1.5 max-w-sm">
        <FieldLabel>{t("vpc.wizard.region")} *</FieldLabel>
        <Select
          value={region}
          onValueChange={(value) => {
            form.setValue("region", value, { shouldValidate: true })
          }}
          disabled={isLoading || !regions?.length}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={regionPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {regions?.map((r) => (
              <SelectItem key={r.code} value={r.code}>
                {r.code} — {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={form.formState.errors.region?.message} />
      </div>

      <div className="space-y-1.5 max-w-sm">
        <FieldLabel>{t("resourceGroups.field.label")} *</FieldLabel>
        <Controller
          control={form.control}
          name="resource_group_id"
          render={({ field }) => (
            <RGField
              value={field.value}
              onChange={(id) => {
                form.setValue("resource_group_id", id, { shouldValidate: true })
              }}
              aria-invalid={!!form.formState.errors.resource_group_id}
            />
          )}
        />
        <p className="text-[11px] text-muted-foreground">{t("resourceGroups.field.hint")}</p>
        <FieldError message={form.formState.errors.resource_group_id?.message} />
      </div>
    </div>
  )
}

/* ── Step 2: CIDR & subnets ────────────────────────────────────────────── */

interface CidrAndSubnetsStepProps {
  form: UseFormReturn<FormValues>
  zones: AvailabilityZoneBrief[]
  maxAz: number
  azCount: number
  onAzCount: (n: number) => void
  publicPerAz: number
  onPublicPerAz: (n: number) => void
  privatePerAz: number
  onPrivatePerAz: (n: number) => void
  subnets: SubnetDraft[]
  onSubnetChange: (key: number, patch: Partial<SubnetDraft>) => void
  onAddSubnet: (isPublic: boolean) => void
  onRemoveSubnet: (key: number) => void
  subnetIssues: Map<number, SubnetCidrIssue | null>
  error?: string
}

function CidrAndSubnetsStep({
  form,
  zones,
  maxAz,
  azCount,
  onAzCount,
  publicPerAz,
  onPublicPerAz,
  privatePerAz,
  onPrivatePerAz,
  subnets,
  onSubnetChange,
  onAddSubnet,
  onRemoveSubnet,
  subnetIssues,
  error,
}: Readonly<CidrAndSubnetsStepProps>) {
  const { t } = useTranslation()
  const [showCustomize, setShowCustomize] = useState(false)
  const cidr = form.watch("cidr")
  const issueMessage = (issue: SubnetCidrIssue) => t(`vpc.wizard.subnetIssue.${issue}`)
  // Surface broken rows even before the user hits Next, so the customize panel
  // auto-expands when there's something to fix.
  const issueCount = subnets.filter((s) => subnetIssues.get(s.key) != null).length

  return (
    <div className="space-y-6">
      {/* IPv4 CIDR block */}
      <div className="space-y-1.5 max-w-sm">
        <FieldLabel>{t("vpc.columns.ipv4Cidr")} *</FieldLabel>
        <div className="flex items-center gap-3">
          <Controller
            control={form.control}
            name="cidr"
            render={({ field }) => (
              <CidrInput
                value={field.value}
                onChange={field.onChange}
                prefixOptions={VPC_PREFIX_OPTIONS}
                aria-label={t("vpc.columns.cidr")}
                aria-invalid={!!form.formState.errors.cidr}
              />
            )}
          />
          <span className="font-mono text-[12px] text-muted-foreground whitespace-nowrap tabular-nums">
            {t("vpc.wizard.ipCount", { ips: formatIpCount(cidr) })}
          </span>
        </div>
        <FieldError message={form.formState.errors.cidr?.message} />
      </div>

      <AddressSpace cidr={cidr} />

      {/* Subnet layout controls */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <FieldLabel>{t("vpc.wizard.availabilityZones")}</FieldLabel>
          <Segmented
            value={azCount}
            min={1}
            max={maxAz}
            onChange={onAzCount}
            ariaLabel={t("vpc.wizard.availabilityZones")}
          />
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-4">
          <CountStepper
            label={t("vpc.wizard.publicSubnetsPerAz")}
            icon={<Globe className="size-3.5" aria-hidden />}
            value={publicPerAz}
            min={0}
            max={MAX_SUBNETS_PER_AZ}
            onChange={onPublicPerAz}
          />
          <CountStepper
            label={t("vpc.wizard.privateSubnetsPerAz")}
            icon={<Lock className="size-3.5" aria-hidden />}
            value={privatePerAz}
            min={0}
            max={MAX_SUBNETS_PER_AZ}
            onChange={onPrivatePerAz}
          />
        </div>
      </div>

      {error && <p className="text-[11px] text-destructive">{error}</p>}

      {issueCount > 0 && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{t("vpc.wizard.subnetsInvalidCount", { count: issueCount })}</span>
        </div>
      )}

      {/* Customize CIDR blocks (AWS-style collapsible) */}
      <div className="rounded-lg border border-border-glass">
        <button
          type="button"
          onClick={() => {
            setShowCustomize((v) => !v)
          }}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          aria-expanded={showCustomize || issueCount > 0}
        >
          <span className="text-[13px] font-medium text-foreground">
            {t("vpc.wizard.customizeSubnets")}
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              showCustomize && "rotate-180",
            )}
            aria-hidden
          />
        </button>

        {(showCustomize || issueCount > 0) && (
          <div className="space-y-3 border-t border-border-glass px-4 py-3">
            {subnets.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                {t("vpc.wizard.previewNoSubnets")}
              </p>
            ) : (
              subnets.map((s, i) => {
                const issue = subnetIssues.get(s.key) ?? null
                return (
                  <div key={s.key} className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Visibility toggle — flip public/private in place */}
                      <button
                        type="button"
                        onClick={() => {
                          onSubnetChange(s.key, {
                            is_public: !s.is_public,
                          })
                        }}
                        aria-label={
                          s.is_public ? t("vpc.wizard.makePrivate") : t("vpc.wizard.makePublic")
                        }
                        title={s.is_public ? t("vpc.badges.public") : t("vpc.badges.private")}
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-md border border-input transition-colors",
                          s.is_public
                            ? "bg-status-info-bg text-status-info"
                            : "bg-status-neutral-bg text-status-neutral",
                        )}
                      >
                        {s.is_public ? (
                          <Globe className="size-3.5" aria-hidden />
                        ) : (
                          <Lock className="size-3.5" aria-hidden />
                        )}
                      </button>

                      {/* Availability zone */}
                      <Select
                        value={s.zone}
                        onValueChange={(z) => {
                          onSubnetChange(s.key, { zone: z })
                        }}
                      >
                        <SelectTrigger
                          aria-label={t("vpc.subnetForm.zone")}
                          className="h-9 w-31 shrink-0 text-[12px]"
                        >
                          <SelectValue placeholder={t("vpc.subnetForm.zonePlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {zones.map((z) => (
                            <SelectItem key={z.id} value={z.id}>
                              {z.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        value={s.name}
                        onChange={(e) => {
                          onSubnetChange(s.key, { name: e.target.value })
                        }}
                        placeholder={autoSubnetName("vpc", s.is_public, i)}
                        className="h-9 min-w-30 flex-1 font-mono text-[13px]"
                      />

                      <CidrInput
                        value={s.cidr}
                        onChange={(value) => {
                          onSubnetChange(s.key, { cidr: value })
                        }}
                        prefixOptions={SUBNET_PREFIX_OPTIONS}
                        aria-label={t("vpc.subnetForm.cidr")}
                        aria-invalid={issue != null}
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          onRemoveSubnet(s.key)
                        }}
                        aria-label={t("vpc.wizard.removeSubnet")}
                        className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    {issue && (
                      <p className="pl-11 text-[11px] text-destructive">{issueMessage(issue)}</p>
                    )}
                  </div>
                )
              })
            )}

            {/* Add a subnet to either tier independently of the per-AZ template */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onAddSubnet(true)
                }}
                className="gap-1.5"
              >
                <Globe className="size-3.5" aria-hidden />
                {t("vpc.wizard.addPublicSubnet")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onAddSubnet(false)
                }}
                className="gap-1.5"
              >
                <Lock className="size-3.5" aria-hidden />
                {t("vpc.wizard.addPrivateSubnet")}
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground">{t("vpc.subnetForm.cidrHint")}</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Address-space visualizer ──────────────────────────────────────────── */

function AddressSpace({ cidr }: Readonly<{ cidr: string }>) {
  const { t } = useTranslation()
  const range = cidrRange(cidr)
  if (!range) return null

  const rows: { label: string; value: string }[] = [
    { label: t("vpc.wizard.networkAddress"), value: range.network },
    { label: t("vpc.wizard.firstUsable"), value: range.firstUsable },
    { label: t("vpc.wizard.lastUsable"), value: range.lastUsable },
    { label: t("vpc.wizard.broadcast"), value: range.broadcast },
  ]

  return (
    <div className="rounded-lg border border-border-glass bg-background/30 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Waypoints className="size-3.5" aria-hidden />
        {t("vpc.wizard.addressSpace")}
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4">
        {rows.map((row) => (
          <div key={row.label} className="space-y-0.5">
            <dt className="text-[10px] text-muted-foreground">{row.label}</dt>
            <dd className="font-mono text-[12px] text-foreground tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/* ── Small controls ────────────────────────────────────────────────────── */

function Segmented({
  value,
  min,
  max,
  onChange,
  ariaLabel,
}: Readonly<{
  value: number
  min: number
  max: number
  onChange: (n: number) => void
  ariaLabel: string
}>) {
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-md border border-input p-0.5"
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          role="radio"
          aria-checked={value === opt}
          onClick={() => {
            onChange(opt)
          }}
          className={cn(
            "min-w-9 rounded px-3 py-1 font-mono text-[13px] tabular-nums transition-colors",
            value === opt
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function CountStepper({
  label,
  icon,
  value,
  min,
  max,
  onChange,
}: Readonly<{
  label: string
  icon: React.ReactNode
  value: number
  min: number
  max: number
  onChange: (n: number) => void
}>) {
  return (
    <div className="space-y-1.5">
      <FieldLabel>
        <span className="flex items-center gap-1.5">
          {icon}
          {label}
        </span>
      </FieldLabel>
      <div className="inline-flex items-center rounded-md border border-input">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 rounded-r-none"
          disabled={value <= min}
          onClick={() => {
            onChange(Math.max(min, value - 1))
          }}
          aria-label={`${label} −`}
        >
          <Minus className="size-3.5" />
        </Button>
        <span className="w-10 text-center font-mono text-sm tabular-nums">{value}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 rounded-l-none"
          disabled={value >= max}
          onClick={() => {
            onChange(Math.min(max, value + 1))
          }}
          aria-label={`${label} +`}
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
