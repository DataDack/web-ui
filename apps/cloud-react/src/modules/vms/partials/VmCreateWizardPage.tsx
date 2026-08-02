import { useEffect, useMemo, useState } from "react"

import { Button } from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Box,
  Cpu,
  CreditCard,
  Globe,
  HardDrive,
  Loader2,
  Lock,
  Server,
  Settings,
  type LucideIcon,
} from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"

import { ConfirmDialog, PageHeader } from "@/components/console"
import { tagRowsToRecord, type TagRow } from "@/lib/tags"
import { evaluateCreditGuard, type CreditGuardVerdict } from "@/modules/billing/billing.guard"
import { useCreditBalance, useSubscriptions } from "@/modules/billing/billing.hooks"
import { CreditGuardDialog } from "@/modules/billing/partials/CreditGuardDialog"
import {
  useBandwidthPrices,
  useImageCatalog,
  useRegionCatalog,
  useStaticIPPrices,
  useStoragePrices,
  useVMPrices,
} from "@/modules/catalog/catalog.hooks"
import type {
  BandwidthPriceOption,
  RegionCatalog,
  StaticIPPriceOption,
  StoragePriceOption,
  VMPriceOption,
} from "@/modules/catalog/catalog.types"
import { QuotaNotice, useQuotaBlocked } from "@/modules/governance/components/QuotaNotice"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import { useActiveRegion } from "@/modules/region/region.context"
import { SUPPORT_ROUTES } from "@/modules/support-tickets/support-tickets.constants"
import { useVPCs } from "@/modules/vpc/vpc.hooks"
import { useScreen } from "@/services/api/screen"

import { VMS_ROUTES } from "../vms.constants"
import { useCreateInstance } from "../vms.hooks"
import { BasicsStep } from "./wizard/BasicsStep"
import { BillingStep } from "./wizard/BillingStep"
import { DiskStep } from "./wizard/DiskStep"
import { LocationAndNetworkStep } from "./wizard/LocationAndNetworkStep"
import { MachinePlanStep } from "./wizard/MachinePlanStep"
import { OSStep } from "./wizard/OSStep"
import { SshStep } from "./wizard/SshStep"
import { formatPrice } from "./wizard/wizard.format"
import { makeSchema, type FormValues } from "./wizard/wizard.types"

/* ── Helpers ───────────────────────────────────────────────────────────── */

/** The availability zone the user picked (region = zone code, zone = AZ code). */
function findAZ(regions: RegionCatalog[], regionCode: string, zoneCode: string) {
  return regions
    .find((r) => r.code === regionCode)
    ?.availability_zones.find((az) => az.code === zoneCode)
}

/** Machine-type offerings priced for the selected availability zone. */
function pricesForZone(
  prices: VMPriceOption[],
  regions: RegionCatalog[],
  regionCode: string,
  zoneCode: string,
): VMPriceOption[] {
  const az = findAZ(regions, regionCode, zoneCode)
  if (!az) return []
  return prices.filter((p) => p.availability_zone_id === az.id)
}

/** The cheapest active static-IPv4 offering for the selected zone, or null when
 * the admin hasn't priced one. Used to surface the public-IP charge. */
function staticIpPriceForZone(
  prices: StaticIPPriceOption[],
  regions: RegionCatalog[],
  regionCode: string,
  zoneCode: string,
): StaticIPPriceOption | null {
  const az = findAZ(regions, regionCode, zoneCode)
  if (!az) return null
  const candidates = prices.filter(
    (p) =>
      p.availability_zone_id === az.id &&
      p.is_active &&
      (p.ip_version === "ipv4" || p.ip_version === ""),
  )
  if (candidates.length === 0) return null
  return candidates.reduce((a, b) => (b.price_monthly < a.price_monthly ? b : a), candidates[0])
}

/** The active bandwidth (data-transfer) offering for the selected zone, or null
 * when the admin hasn't priced one. Prefers egress, then both. */
function bandwidthPriceForZone(
  prices: BandwidthPriceOption[],
  regions: RegionCatalog[],
  regionCode: string,
  zoneCode: string,
): BandwidthPriceOption | null {
  const az = findAZ(regions, regionCode, zoneCode)
  if (!az) return null
  const candidates = prices.filter((p) => p.availability_zone_id === az.id && p.is_active)
  if (candidates.length === 0) return null
  return (
    candidates.find((p) => p.direction === "egress") ??
    candidates.find((p) => p.direction === "both") ??
    candidates[0]
  )
}

/** The block-storage offering matching the selected zone and disk type, or null
 * when the admin hasn't priced one. Drives the per-GB data-disk charge. */
/** All active block-storage offerings for the selected zone. Sourced from the
 * catalog so the Volume Class options (and their prices) come straight from the
 * backend rather than a hardcoded list. */
function storageOptionsForZone(
  prices: StoragePriceOption[],
  regions: RegionCatalog[],
  regionCode: string,
  zoneCode: string,
): StoragePriceOption[] {
  const az = findAZ(regions, regionCode, zoneCode)
  if (!az) return []
  return prices.filter((p) => p.availability_zone_id === az.id && p.is_active)
}

/** Approximate hours in a month, used to prorate monthly storage rates onto an
 * hourly bill so the cost summary stays consistent across billing cycles. */
const HOURS_PER_MONTH = 730

/** Boot-disk capacity bundled free with every instance. The first
 * INCLUDED_DISK_GB of the boot volume costs nothing; only GB beyond it bill at
 * the per-GB storage rate. Flat allowance for now — later this can come from the
 * selected plan (VMPriceOption.default_boot_disk_gb). */
const INCLUDED_DISK_GB = 30

/** Pick the rate matching the active billing cycle. */
const billingAmount = (isHourly: boolean, hourly: number, monthly: number) =>
  isHourly ? hourly : monthly

/** Format a price in the active billing cycle: hourly rates render with extra precision. */
const formatBillingPrice = (
  isHourly: boolean,
  hourly: number,
  monthly: number,
  currency: string,
) => (isHourly ? formatPrice(hourly, currency, true) : formatPrice(monthly, currency))

export function VmCreateWizardPage() {
  useScreen("vms.vm-create-wizard")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { mutateAsync: createInstance, isPending } = useCreateInstance()

  const { data: vpcs = [] } = useVPCs()
  const { data: regions = [] } = useRegionCatalog()
  const { data: families = [] } = useImageCatalog()
  const { data: prices = [] } = useVMPrices()
  const { data: staticIpPrices = [] } = useStaticIPPrices()
  const { data: bandwidthPrices = [] } = useBandwidthPrices()
  const { data: storagePrices = [] } = useStoragePrices()
  const { activeRegionCode } = useActiveRegion()
  const [tagRows, setTagRows] = useState<TagRow[]>([{ key: "", value: "" }])
  const { rule } = useNamingRule("vm")
  const schema = useMemo(() => makeSchema(rule), [rule])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      resource_group_id: "",
      region: "",
      zone: "",
      machine_type_id: "",
      billing_period: "hourly",
      image_id: "",
      vpc_id: "",
      subnet_id: "",
      skip_vpc: true,
      security_group_ids: [],
      // Default selection is VPS (skip_vpc), which is internet-facing, so
      // start with a free ephemeral public IP to match.
      public_ip_type: "ephemeral",
      ssh_key_id: "",
      disk_size_gb: 50,
      disk_type: "ssd",
      private_ip: "",
      _subnet_cidr: "",
      description: "",
      termination_protection: false,
      volume_class: "",
      delete_on_termination: true,
    },
    mode: "onTouched",
  })

  useEffect(() => {
    if (regions.length === 0) return
    const region =
      regions.find((r) => r.code === activeRegionCode) ??
      regions.find((r) => r.availability_zones.length > 0) ??
      regions[0]
    if (form.getValues("region") === region.code) return
    form.setValue("region", region.code)
    form.setValue("zone", region.availability_zones.at(0)?.code ?? "")
    form.setValue("machine_type_id", "")
  }, [regions, activeRegionCode, form])

  // A monthly instance is committed for the whole billing month and can't be
  // terminated until it ends (early termination goes through support), so we
  // require the customer to see and accept that policy BEFORE anything is
  // created. `confirmMonthly` holds the pending form values while the consent
  // dialog is open; hourly instances skip the gate and deploy straight away.
  const [confirmMonthly, setConfirmMonthly] = useState<FormValues | null>(null)

  // Wallet pre-flight: deploy first runs the credit guard (overdue account,
  // balance below the hourly 24h runway / monthly upfront, or < 3h of
  // account-wide runway left) and pops a dialog instead of letting the
  // request die on a 402. Holds the verdict + the pending form values so the
  // low-runway warning's "Continue anyway" can resume the deploy.
  const { data: creditBalance } = useCreditBalance()
  const { data: subscriptions = [] } = useSubscriptions()
  const [creditGuard, setCreditGuard] = useState<{
    verdict: CreditGuardVerdict
    values: FormValues
  } | null>(null)

  // SSH key is optional, but launching with none means the instance can't be
  // reached over SSH and a key can't be added afterwards — so a no-key deploy
  // is confirmed first. Holds the pending form values while the warning is open.
  const [confirmNoSshKey, setConfirmNoSshKey] = useState<FormValues | null>(null)

  const deploy = async (values: FormValues) => {
    try {
      const trimmedName = values.name?.trim() ?? ""
      const finalName =
        trimmedName.length > 0 ? trimmedName : `server-${crypto.randomUUID().slice(0, 6)}`
      await createInstance({
        name: finalName,
        resource_group_id: values.resource_group_id,
        description: values.description,
        termination_protection: values.termination_protection,
        region: values.region,
        zone: values.zone,
        machine_type_id: values.machine_type_id,
        billing_period: values.billing_period,
        // Set once the hourly-billing policy has been acknowledged in the
        // dialog; ignored by the backend for monthly instances.
        acknowledge_hourly_policy: values.billing_period === "hourly",
        image_id: values.image_id,
        vpc_id: values.skip_vpc ? "" : values.vpc_id,
        subnet_id: values.skip_vpc ? "" : values.subnet_id,
        security_group_ids:
          values.security_group_ids.length > 0 ? values.security_group_ids : undefined,
        ssh_key_id: values.ssh_key_id,
        private_ip: values.skip_vpc ? undefined : values.private_ip || undefined,
        public_ip_type: values.public_ip_type,
        tags: JSON.stringify(tagRowsToRecord(tagRows)),
        disk_size_gb: values.disk_size_gb,
        disk_type: values.disk_type,
        volume_class: values.volume_class,
        delete_on_termination: values.delete_on_termination,
      })
      void navigate(VMS_ROUTES.ROOT)
    } catch {
      // Error toasts handled by mutations; close the consent dialog (if
      // open) so the toast is visible.
      setConfirmMonthly(null)
    }
  }

  // Post-guard deploy path: monthly opens the consent dialog, hourly deploys.
  const proceed = (values: FormValues) => {
    if (values.billing_period === "monthly") {
      setConfirmMonthly(values) // open the consent dialog; deploy on confirm
      return
    }
    void deploy(values)
  }

  // Wallet pre-flight + deploy path, run once any deploy-time warnings are
  // cleared. Split out so the missing-SSH-key confirmation can resume here.
  const runGuards = (values: FormValues) => {
    const price = pricesForZone(prices, regions, values.region, values.zone).find(
      (p) => p.id === values.machine_type_id,
    )
    const verdict = evaluateCreditGuard({
      balance: creditBalance,
      subscriptions,
      cycle: values.billing_period,
      hourlyRate: price?.price_hourly ?? 0,
      monthlyAmount: price?.price_monthly ?? 0,
    })
    if (verdict) {
      setCreditGuard({ verdict, values })
      return
    }
    proceed(values)
  }

  const onSubmit = (values: FormValues) => {
    // Warn before deploying with no SSH key selected; the rest of the deploy
    // flow resumes from runGuards once the user confirms.
    if (!values.ssh_key_id) {
      setConfirmNoSshKey(values)
      return
    }
    runGuards(values)
  }

  // Helper derivations for Cost Summary — useWatch keeps these reactive without
  // opting the component out of the React Compiler (which form.watch() would).
  const { control } = form
  const region = useWatch({ control, name: "region" })
  const zone = useWatch({ control, name: "zone" })
  const selectedMachine = useWatch({ control, name: "machine_type_id" })
  const billingPeriod = useWatch({ control, name: "billing_period" })
  const diskSizeGb = useWatch({ control, name: "disk_size_gb" })
  const diskType = useWatch({ control, name: "disk_type" })
  const publicIpType = useWatch({ control, name: "public_ip_type" })
  const zonePrices = useMemo(
    () => pricesForZone(prices, regions, region, zone),
    [prices, regions, region, zone],
  )
  const activePrice = zonePrices.find((p) => p.id === selectedMachine)

  // Static-IPv4 surcharge for the selected zone, only billed when the user
  // opts into a public IP.
  const staticIpPrice = useMemo(
    () => staticIpPriceForZone(staticIpPrices, regions, region, zone),
    [staticIpPrices, regions, region, zone],
  )
  const bandwidthPrice = useMemo(
    () => bandwidthPriceForZone(bandwidthPrices, regions, region, zone),
    [bandwidthPrices, regions, region, zone],
  )
  // Volume Class options come straight from the catalog for the active zone.
  const storageOptions = useMemo(
    () => storageOptionsForZone(storagePrices, regions, region, zone),
    [storagePrices, regions, region, zone],
  )
  const storagePrice = storageOptions.find((p) => p.storage_type === diskType) ?? null

  // Keep the selected storage offering valid as the zone (and its catalog)
  // changes — default to the first available offering.
  useEffect(() => {
    if (storageOptions.length === 0) return
    if (storageOptions.some((o) => o.storage_type === diskType)) return
    const first = storageOptions[0]
    form.setValue("disk_type", first.storage_type)
    form.setValue("volume_class", first.sku)
  }, [storageOptions, diskType, form])

  return (
    <div className="pb-24">
      <PageHeader
        icon={Server}
        breadcrumbs={[
          { label: t("console.nav.groups.compute") },
          { label: t("vms.title"), to: VMS_ROUTES.ROOT },
          { label: t("vms.create") },
        ]}
        title={t("vms.vmCreateWizardPage.deployCloudInstance")}
        description={t("vms.vmCreateWizardPage.configureAndLaunchYourCloudInfrastructure")}
      />

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_320px]">
        {/* Left Column: Form Sections */}
        <div className="space-y-6">
          <SectionCard
            title={t("vms.vmCreateWizardPage.generalSettings")}
            icon={Settings}
            description={t("vms.vmCreateWizardPage.instanceNameResourceGroupAndTagging")}
          >
            <BasicsStep form={form} tagRows={tagRows} setTagRows={setTagRows} />
          </SectionCard>

          <SectionCard
            title={t("vms.vmCreateWizardPage.billingCycle")}
            icon={CreditCard}
            description={t("vms.vmCreateWizardPage.hourlyMonthlyOrYearlyBilling")}
          >
            <BillingStep form={form} />
          </SectionCard>

          <SectionCard
            title={t("vms.vmCreateWizardPage.locationNetwork")}
            icon={Globe}
            description={t("vms.vmCreateWizardPage.dataCenterAndNetworkIsolation")}
          >
            <LocationAndNetworkStep
              form={form}
              regions={regions}
              vpcs={vpcs}
              staticIpPrice={staticIpPrice}
            />
          </SectionCard>

          <SectionCard
            title={t("vms.vmCreateWizardPage.selectOsApps")}
            icon={Box}
            description={t("vms.vmCreateWizardPage.operatingSystemMarketplaceIsos")}
          >
            <OSStep form={form} families={families} />
          </SectionCard>

          <SectionCard
            title={t("vms.vmCreateWizardPage.selectPlan")}
            icon={Cpu}
            description={t("vms.vmCreateWizardPage.chooseHardwareSpecsForYourInstance")}
          >
            <MachinePlanStep form={form} zonePrices={zonePrices} activePrice={activePrice} />
          </SectionCard>

          <SectionCard
            title={t("vms.vmCreateWizardPage.storageConfiguration")}
            icon={HardDrive}
            description={t("vms.vmCreateWizardPage.configureBootAndDataDisks")}
          >
            <DiskStep form={form} storageOptions={storageOptions} />
          </SectionCard>

          <SectionCard
            title={t("vms.vmCreateWizardPage.authConfiguration")}
            icon={Lock}
            description={t("vms.vmCreateWizardPage.setupSshAccess")}
          >
            <SshStep form={form} />
          </SectionCard>
        </div>

        {/* Right Column: Cost Summary */}
        <CostSummary
          billingPeriod={billingPeriod}
          activePrice={activePrice}
          storagePrice={storagePrice}
          diskSizeGb={diskSizeGb}
          bandwidthPrice={bandwidthPrice}
          publicIpType={publicIpType}
          staticIpPrice={staticIpPrice}
          isPending={isPending}
          isValid={form.formState.isValid}
          onDeploy={() => void form.handleSubmit(onSubmit)()}
        />
      </div>

      <ConfirmDialog
        open={confirmNoSshKey !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmNoSshKey(null)
        }}
        title={t("vms.noSshKey.title")}
        description={t("vms.noSshKey.description")}
        confirmLabel={t("vms.noSshKey.continue")}
        onConfirm={() => {
          const pending = confirmNoSshKey
          setConfirmNoSshKey(null)
          if (pending) runGuards(pending)
        }}
      />

      <CreditGuardDialog
        verdict={creditGuard?.verdict ?? null}
        onOpenChange={(open) => {
          if (!open) setCreditGuard(null)
        }}
        onContinue={() => {
          const pending = creditGuard
          setCreditGuard(null)
          if (pending) proceed(pending.values)
        }}
      />

      <ConfirmDialog
        open={confirmMonthly !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmMonthly(null)
        }}
        title={t("vms.monthlyPolicy.title")}
        description={
          <>
            {t("vms.monthlyPolicy.description")}{" "}
            <Link
              to={SUPPORT_ROUTES.CREATE}
              className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
            >
              {t("vms.monthlyPolicy.supportLink")}
            </Link>
          </>
        }
        destructive={false}
        confirmLabel={t("vms.monthlyPolicy.continue")}
        loading={isPending}
        onConfirm={() => {
          if (confirmMonthly) void deploy(confirmMonthly)
        }}
      />
    </div>
  )
}

/** Per-line instance/disk/bandwidth breakdown, shown once a plan is selected. */
function PlanCostRows({
  activePrice,
  storagePrice,
  diskSizeGb,
  diskAmount,
  bandwidthPrice,
  isHourly,
  periodSuffix,
}: Readonly<{
  activePrice: VMPriceOption
  storagePrice: StoragePriceOption | null
  diskSizeGb: number
  diskAmount: number
  bandwidthPrice: BandwidthPriceOption | null
  isHourly: boolean
  periodSuffix: string
}>) {
  const billableDiskGb = Math.max(0, (diskSizeGb || 0) - INCLUDED_DISK_GB)
  return (
    <div className="space-y-2 pt-2 border-t border-border-glass">
      <div className="flex justify-between items-center text-[13px]">
        <span className="text-muted-foreground">Instance</span>
        <span className="font-mono text-foreground font-medium">
          {formatBillingPrice(
            isHourly,
            activePrice.price_hourly,
            activePrice.price_monthly,
            activePrice.currency,
          )}
          <span className="ml-0.5 text-[11px] font-sans text-muted-foreground">{periodSuffix}</span>
        </span>
      </div>
      <div className="flex justify-between items-start text-[13px]">
        <span className="text-muted-foreground">
          Data Disk ({diskSizeGb || 0} GB
          {storagePrice ? ` · ${storagePrice.storage_type}` : ""})
          <span className="block text-[11px] text-muted-foreground/70">
            {billableDiskGb > 0
              ? `${String(INCLUDED_DISK_GB)} GB free · ${String(billableDiskGb)} GB billed`
              : `First ${String(INCLUDED_DISK_GB)} GB free`}
          </span>
        </span>
        <span className="font-mono text-foreground font-medium text-[12px]">
          {storagePrice && diskAmount > 0 ? (
            <>
              {formatPrice(diskAmount, storagePrice.currency, isHourly)}
              <span className="ml-0.5 font-sans text-muted-foreground">{periodSuffix}</span>
            </>
          ) : (
            "Included"
          )}
        </span>
      </div>
      {bandwidthPrice && (
        <div className="flex justify-between items-center text-[13px]">
          <span className="text-muted-foreground">Bandwidth ({bandwidthPrice.included_gb} GB)</span>
          <span className="font-mono text-foreground font-medium text-[12px]">
            {bandwidthPrice.price_per_gb > 0
              ? `then ${formatPrice(bandwidthPrice.price_per_gb, bandwidthPrice.currency)}/GB`
              : "Free"}
          </span>
        </div>
      )}
    </div>
  )
}

function CostSummary({
  billingPeriod,
  activePrice,
  storagePrice,
  diskSizeGb,
  bandwidthPrice,
  publicIpType,
  staticIpPrice,
  isPending,
  isValid,
  onDeploy,
}: Readonly<{
  billingPeriod: string
  activePrice?: VMPriceOption
  storagePrice: StoragePriceOption | null
  diskSizeGb: number
  bandwidthPrice: BandwidthPriceOption | null
  publicIpType: "none" | "ephemeral" | "static"
  staticIpPrice: StaticIPPriceOption | null
  isPending: boolean
  isValid: boolean
  onDeploy: () => void
}>) {
  const { t } = useTranslation()
  const isHourly = billingPeriod === "hourly"
  const periodSuffix = isHourly ? "/hr" : "/mo"

  // Proactive quota wall: at the instance limit, deploying can only 403, so
  // surface the notice and hold the button.
  const quotaBlocked = useQuotaBlocked("compute.vm_instances")

  // Data-disk charge: size × per-GB-month rate for the chosen storage class,
  // prorated to the active billing cycle.
  // Only disk beyond the free included allowance is billed.
  const billableDiskGb = Math.max(0, (diskSizeGb || 0) - INCLUDED_DISK_GB)
  const diskMonthly = storagePrice ? billableDiskGb * storagePrice.price_per_gb_month : 0
  const diskAmount = isHourly ? diskMonthly / HOURS_PER_MONTH : diskMonthly

  // Only a reserved (static) IP is billed; an ephemeral IP is free.
  const publicIpCharge = publicIpType === "static" ? staticIpPrice : null
  const publicIpAmount = publicIpCharge
    ? billingAmount(isHourly, publicIpCharge.price_hourly, publicIpCharge.price_monthly)
    : 0

  return (
    <div className="sticky top-18">
      <div className="rounded-xl border border-border-glass bg-background/50 backdrop-blur-xl shadow-lg shadow-black/5 overflow-hidden">
        <div className="border-b border-border-glass px-5 py-4">
          <h3 className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            {t("vms.vmCreateWizardPage.costSummary")}
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex justify-between items-center text-[13px]">
            <span className="text-muted-foreground">
              {t("vms.vmCreateWizardPage.billingCycle2")}
            </span>
            <span className="font-medium text-foreground bg-accent/50 px-2 py-0.5 rounded text-[11px] uppercase tracking-wide">
              {billingPeriod}
            </span>
          </div>

          {activePrice ? (
            <PlanCostRows
              activePrice={activePrice}
              storagePrice={storagePrice}
              diskSizeGb={diskSizeGb}
              diskAmount={diskAmount}
              bandwidthPrice={bandwidthPrice}
              isHourly={isHourly}
              periodSuffix={periodSuffix}
            />
          ) : (
            <div className="pt-2 border-t border-border-glass text-[12px] text-muted-foreground text-center py-4">
              {t("vms.vmCreateWizardPage.selectAPlanToSeeCostDetails")}
            </div>
          )}

          {publicIpType !== "none" && (
            <div className="flex justify-between items-center text-[13px] pt-2 border-t border-border-glass">
              <span className="text-muted-foreground">
                {publicIpType === "static" ? "Public IPv4 (Static)" : "Public IPv4 (Dynamic)"}
              </span>
              {publicIpCharge ? (
                <span className="font-mono text-foreground font-medium">
                  {formatBillingPrice(
                    isHourly,
                    publicIpCharge.price_hourly,
                    publicIpCharge.price_monthly,
                    publicIpCharge.currency,
                  )}
                  <span className="ml-0.5 text-[11px] font-sans text-muted-foreground">
                    {periodSuffix}
                  </span>
                </span>
              ) : (
                <span className="font-mono text-status-success text-[12px]">Free</span>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-border-glass">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold text-foreground">
                {t("vms.vmCreateWizardPage.totalCost")}
              </span>
              <span className="text-2xl font-mono font-bold text-primary">
                {activePrice
                  ? formatBillingPrice(
                      isHourly,
                      activePrice.price_hourly + publicIpAmount + diskAmount,
                      activePrice.price_monthly + publicIpAmount + diskAmount,
                      publicIpCharge?.currency ?? activePrice.currency,
                    )
                  : "—"}
                {activePrice && (
                  <span className="ml-0.5 text-[11px] font-sans text-muted-foreground">
                    {periodSuffix}
                  </span>
                )}
              </span>
            </div>
            {publicIpCharge && activePrice && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t("vms.vmCreateWizardPage.includesPublicIpv4AddressCharge")}
              </p>
            )}
          </div>

          <QuotaNotice code="compute.vm_instances" />

          {/* Deploy is always pressable (an unverified account is stopped by
                        the backend 403, which surfaces the persistent KYC toast) —
                        except at the instance quota, where it can only fail. */}
          <Button
            type="button"
            className="mt-2 w-full h-11"
            disabled={isPending || !isValid || quotaBlocked}
            onClick={onDeploy}
            loading={isPending}
          >
            {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Deploy Now
          </Button>
        </div>
      </div>
    </div>
  )
}

function SectionCard({
  title,
  icon: Icon,
  description,
  children,
}: Readonly<{
  title: string
  icon: LucideIcon
  description: string
  children: React.ReactNode
}>) {
  return (
    <div className="rounded-xl border border-border-glass bg-background/50 backdrop-blur-xl shadow-sm overflow-hidden">
      <div className="border-b border-border-glass bg-muted/20 px-5 py-4 flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent/50 text-muted-foreground">
          <Icon className="size-4" />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-foreground">{title}</h2>
          <p className="text-[12px] text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}
