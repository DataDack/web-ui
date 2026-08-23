import { useEffect, useMemo, useState } from "react"

import {
  Badge,
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@datadack/common-ui"
import { Package, RefreshCw } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"

import { PageHeader, Section } from "@/components/console"

import { AUTO_SETUP_OPTIONS, HOSTING_ADMIN_ROUTES, UNLIMITED } from "../hosting.constants"
import {
  useAdminHostingPlan,
  useAdminHostingPlans,
  useHostingServerGroups,
  useHostingServers,
  useSaveHostingPlan,
  useServerPackages,
} from "../hosting.hooks"
import type { AutoSetup, HostingPlan, HostingServer, PlanLimits } from "../hosting.types"
import { formatLimitMB } from "../hosting.utils"

const EMPTY_PLAN: HostingPlan = {
  sku: "",
  group: "",
  name: "",
  description: "",
  module_key: "cpanel",
  server_group: "",
  whm_package: "",
  limits: {
    disk_mb: 10240,
    bandwidth_mb: 512000,
    addon_domains: 1,
    subdomains: 25,
    parked_domains: 5,
    email_accounts: 50,
    databases: 10,
    ftp_accounts: 5,
    cpu_pct: 100,
    iops: 1024,
    entry_procs: 20,
  },
  features: [],
  pricing: { currency: "INR", monthly: 0, quarterly: 0, annual: 0, setup_fee: 0 },
  auto_setup: "on_payment",
  visible: true,
  sort_order: 10,
  retired: false,
}

const LIMIT_FIELDS: { key: keyof PlanLimits; label: string; unit: "mb" | "count" }[] = [
  { key: "disk_mb", label: "Disk space", unit: "mb" },
  { key: "bandwidth_mb", label: "Bandwidth", unit: "mb" },
  { key: "addon_domains", label: "Addon domains", unit: "count" },
  { key: "subdomains", label: "Subdomains", unit: "count" },
  { key: "parked_domains", label: "Parked domains", unit: "count" },
  { key: "email_accounts", label: "Email accounts", unit: "count" },
  { key: "databases", label: "Databases", unit: "count" },
  { key: "ftp_accounts", label: "FTP accounts", unit: "count" },
  { key: "cpu_pct", label: "CPU %", unit: "count" },
  { key: "iops", label: "IOPS", unit: "count" },
  { key: "entry_procs", label: "Entry processes", unit: "count" },
]

/**
 * Define a sellable plan.
 *
 * The one field that must match reality is the panel package: it is applied
 * verbatim on the server, and a typo surfaces minutes later as a dead-lettered
 * provisioning job. So it is picked from a LIVE pull off a server in the plan's
 * group, never typed.
 */
export function HostingPlanFormPage() {
  const { sku } = useParams<{ sku: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(sku)

  const { data: existing, isLoading } = useAdminHostingPlan(sku)
  const { data: catalogue } = useAdminHostingPlans()
  const { data: groups = [] } = useHostingServerGroups()
  const { data: servers = [] } = useHostingServers()
  const save = useSaveHostingPlan(sku)

  const [plan, setPlan] = useState<HostingPlan>(EMPTY_PLAN)
  const [featuresText, setFeaturesText] = useState("")

  useEffect(() => {
    if (!existing) return
    setPlan(existing)
    setFeaturesText(existing.features.join("\n"))
  }, [existing])

  // The package list comes off a real server in the chosen group. Without a
  // group we fall back to any allocatable box, so a first plan can still be
  // defined before groups exist.
  // Optional by construction: an empty fleet has nothing to read packages from,
  // and `.at()` is what makes that possibility visible to the type system —
  // index access would claim a server exists on a brand-new deployment.
  const sourceServer = useMemo<HostingServer | undefined>(() => {
    const group = groups.find((g) => g.name === plan.server_group)
    const inGroup = servers.filter((s) => (group ? s.group_id === group.id : true))
    return inGroup.find((s) => s.allocatable) ?? inGroup.at(0) ?? servers.at(0)
  }, [groups, servers, plan.server_group])

  const packages = useServerPackages(sourceServer?.id)
  const sourceHostname = sourceServer?.hostname ?? ""

  const set = <K extends keyof HostingPlan>(key: K, value: HostingPlan[K]) => {
    setPlan((p) => ({ ...p, [key]: value }))
  }

  const setLimit = (key: keyof PlanLimits, value: number) => {
    setPlan((p) => ({ ...p, limits: { ...p.limits, [key]: value } }))
  }

  const setPrice = (key: keyof HostingPlan["pricing"], value: number | string) => {
    setPlan((p) => ({ ...p, pricing: { ...p.pricing, [key]: value } }))
  }

  const submit = () => {
    save.mutate(
      {
        ...plan,
        features: featuresText
          .split("\n")
          .map((v) => v.trim())
          .filter(Boolean),
      },
      { onSuccess: () => void navigate(HOSTING_ADMIN_ROUTES.plans) },
    )
  }

  const priced = plan.pricing.monthly > 0 || plan.pricing.quarterly > 0 || plan.pricing.annual > 0

  if (isEdit && isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading plan…</p>
  }

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title={isEdit ? `Edit ${existing?.name ?? "plan"}` : "Add hosting plan"}
        description="Saving writes the plan file to S3; the pricing page picks it up immediately."
        icon={Package}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => void navigate(HOSTING_ADMIN_ROUTES.plans)}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={save.isPending || !plan.sku.trim() || !plan.name.trim() || !priced}
            >
              {save.isPending ? "Saving…" : "Save plan"}
            </Button>
          </div>
        }
      />

      <Section title="Identity" variant="panel">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="SKU" required hint="Stable identifier. Renaming is refused once sold.">
            <Input
              value={plan.sku}
              onChange={(e) => {
                set("sku", e.target.value.toLowerCase())
              }}
              placeholder="shared-starter"
              disabled={isEdit}
            />
          </Field>
          <Field label="Display name" required>
            <Input
              value={plan.name}
              onChange={(e) => {
                set("name", e.target.value)
              }}
              placeholder="Starter"
            />
          </Field>
          <Field label="Section" hint="Which block of the pricing page this appears under.">
            <Select
              value={plan.group || "none"}
              onValueChange={(v) => {
                set("group", v === "none" ? "" : v)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Ungrouped" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ungrouped</SelectItem>
                {(catalogue?.groups ?? []).map((g) => (
                  <SelectItem key={g.key} value={g.key}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Sort order" hint="Lower numbers come first.">
            <Input
              type="number"
              value={plan.sort_order}
              onChange={(e) => {
                set("sort_order", Number(e.target.value))
              }}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Description">
              <Textarea
                rows={2}
                value={plan.description}
                onChange={(e) => {
                  set("description", e.target.value)
                }}
                placeholder="For a first website"
              />
            </Field>
          </div>
        </div>
      </Section>

      <Section
        title="Provisioning"
        description="Where an order lands, and what the panel applies."
        variant="panel"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Provider group"
            hint="Plans allocate from a group so capacity can be added freely."
          >
            <Select
              value={plan.server_group || "any"}
              onValueChange={(v) => {
                set("server_group", v === "any" ? "" : v)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any allocatable provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any allocatable provider</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.name}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Panel package"
            required
            hint={
              sourceServer
                ? `Read live from ${sourceServer.hostname}. This name is applied verbatim on the server.`
                : "Add a server first — the package list is read from a real box."
            }
          >
            <div className="flex gap-2">
              <Select
                value={plan.whm_package}
                onValueChange={(v) => {
                  set("whm_package", v)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={packages.isLoading ? "Loading…" : "Select a package"} />
                </SelectTrigger>
                <SelectContent>
                  {packages.data?.map((p) => (
                    <SelectItem key={p.name} value={p.name}>
                      {p.name} — {formatLimitMB(p.disk_limit_mb)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => void packages.refetch()}
                disabled={!sourceServer || packages.isFetching}
                aria-label="Reload packages"
              >
                <RefreshCw className={`size-4 ${packages.isFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
            {packages.isError && (
              <p className="text-[11px] text-destructive">
                Could not read packages from {sourceHostname}. Test that server&apos;s connection
                first.
              </p>
            )}
            {/* An operator editing an existing plan whose package no longer
                exists on the box has to be able to SEE that, not silently keep
                a value that will dead-letter every order. */}
            {plan.whm_package !== "" &&
              packages.data !== undefined &&
              !packages.data.some((p) => p.name === plan.whm_package) && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                  “{plan.whm_package}” is not on {sourceHostname}. Orders on this plan will fail
                  until it exists or is changed.
                </p>
              )}
          </Field>

          <Field label="Automatic setup" hint="When the account is actually created.">
            <Select
              value={plan.auto_setup}
              onValueChange={(v) => {
                set("auto_setup", v as AutoSetup)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUTO_SETUP_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Section>

      <Section
        title="Pricing"
        description="A price of 0 means the cycle is not offered."
        variant="panel"
      >
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Currency">
            <Input
              value={plan.pricing.currency}
              onChange={(e) => {
                setPrice("currency", e.target.value.toUpperCase())
              }}
            />
          </Field>
          <Field label="Monthly">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={plan.pricing.monthly}
              onChange={(e) => {
                setPrice("monthly", Number(e.target.value))
              }}
            />
          </Field>
          <Field label="Quarterly" hint="Stored, not yet sellable — billing renews monthly.">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={plan.pricing.quarterly}
              onChange={(e) => {
                setPrice("quarterly", Number(e.target.value))
              }}
            />
          </Field>
          <Field label="Annual" hint="Stored, not yet sellable — billing renews monthly.">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={plan.pricing.annual}
              onChange={(e) => {
                setPrice("annual", Number(e.target.value))
              }}
            />
          </Field>
          <Field label="Setup fee">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={plan.pricing.setup_fee}
              onChange={(e) => {
                setPrice("setup_fee", Number(e.target.value))
              }}
            />
          </Field>
        </div>
        {!priced && (
          <p className="mt-3 text-[12px] text-destructive">
            A plan must be priced on at least one cycle before it can be saved.
          </p>
        )}
      </Section>

      <Section
        title="Limits"
        description="Use -1 for unlimited. 0 is a real limit meaning none at all."
        variant="panel"
      >
        <div className="grid gap-4 md:grid-cols-3">
          {LIMIT_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} hint={limitHint(f.unit, plan.limits[f.key])}>
              <Input
                type="number"
                value={plan.limits[f.key]}
                onChange={(e) => {
                  setLimit(f.key, Number(e.target.value))
                }}
              />
            </Field>
          ))}
        </div>
      </Section>

      <Section title="Marketing" variant="panel">
        <Field label="Features" hint="One per line. Shown as the bullet list on the pricing card.">
          <Textarea
            rows={5}
            value={featuresText}
            onChange={(e) => {
              setFeaturesText(e.target.value)
            }}
            placeholder={"Free SSL\nDaily backups\n1-click WordPress"}
          />
        </Field>
        <div className="mt-4 flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Checkbox
              id="plan-visible"
              checked={plan.visible}
              onCheckedChange={(v) => {
                set("visible", Boolean(v))
              }}
            />
            <Label htmlFor="plan-visible" className="cursor-pointer text-[13px] font-normal">
              Show on the pricing page
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="plan-retired"
              checked={plan.retired}
              onCheckedChange={(v) => {
                set("retired", Boolean(v))
              }}
            />
            <Label htmlFor="plan-retired" className="cursor-pointer text-[13px] font-normal">
              Retired
              <Badge variant="outline" className="ml-2 text-[10px]">
                keeps existing accounts working
              </Badge>
            </Label>
          </div>
        </div>
      </Section>
    </div>
  )
}

/**
 * The hint under a limit input. Unlimited is called out by name because -1 in a
 * number box means nothing to a reader; a size limit gets a human-readable
 * conversion; a plain count needs neither.
 */
function limitHint(unit: "mb" | "count", value: number): string | undefined {
  if (value === UNLIMITED) return "Unlimited"
  if (unit === "mb") return formatLimitMB(value)
  return undefined
}

function Field({
  label,
  hint,
  required,
  children,
}: Readonly<{ label: string; hint?: string; required?: boolean; children: React.ReactNode }>) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[13px] font-medium">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  )
}
