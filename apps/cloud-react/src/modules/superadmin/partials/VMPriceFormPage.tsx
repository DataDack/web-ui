import { useEffect, useMemo } from "react"
import { useScreen } from "@/services/api/screen"

import { zodResolver } from "@hookform/resolvers/zod"
import { Cpu } from "lucide-react"
import { Controller, useForm, type UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"
import { z } from "zod/v4"

import { CreateWizard, PageHeader, type WizardStep } from "@/components/console"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { CurrencySelect } from "@/modules/countries/CurrencySelect"

import { useAdminAvailabilityZones, useAdminVMPrices, useSaveVMPrice } from "../superadmin.hooks"
import type { CreateVMPriceRequest, UpdateVMPriceRequest, VMPrice } from "../superadmin.types"

const LIST_PATH = "/admin/vm-prices"
const FAMILIES = ["standard", "compute", "memory", "gpu"] as const
const ARCHITECTURES = ["x86_64", "arm64"] as const
const BILLING_UNITS = ["second", "minute", "hour", "month"] as const

const schema = z.object({
	availability_zone_id: z.string().min(1, "Required"),
	sku: z.string().max(64),
	name: z.string().min(2, "Min 2 characters").max(128),
	display_name: z.string().max(128),
	description: z.string().max(512),
	family: z.enum(FAMILIES),
	generation: z.string().max(32),
	architecture: z.enum(ARCHITECTURES),
	hypervisor: z.string().max(64),
	vcpus: z.coerce.number().int().min(1),
	ram_gb: z.coerce.number().min(0.5),
	cpu_vendor: z.string().max(64),
	cpu_model: z.string().max(128),
	clock_ghz: z.coerce.number().min(0),
	gpu_count: z.coerce.number().int().min(0),
	gpu_type: z.string().max(64),
	local_disk_gb: z.coerce.number().int().min(0),
	default_boot_disk_gb: z.coerce.number().int().min(0),
	max_data_disks: z.coerce.number().int().min(0),
	max_nics: z.coerce.number().int().min(0),
	bandwidth_gbps: z.coerce.number().min(0),
	network_tier: z.string().max(64),
	ipv4_included: z.coerce.number().int().min(0),
	ipv6_supported: z.boolean(),
	baseline_iops: z.coerce.number().int().min(0),
	burst_iops: z.coerce.number().int().min(0),
	features: z.string().refine((value) => value.trim() === "" || isJSON(value), {
		message: "Must be valid JSON",
	}),
	price_hourly: z.coerce.number().min(0),
	price_monthly: z.coerce.number().min(0),
	price_yearly: z.coerce.number().min(0),
	price_spot_hourly: z.coerce.number().min(0),
	price_reserved_monthly: z.coerce.number().min(0),
	price_reserved_yearly: z.coerce.number().min(0),
	setup_fee: z.coerce.number().min(0),
	currency: z.string().max(8),
	billing_unit: z.enum(BILLING_UNITS),
	billing_increment_seconds: z.coerce.number().int().min(1),
	tax_inclusive: z.boolean(),
	sort_order: z.coerce.number().int().min(0),
	is_active: z.boolean(),
})

type FormValues = z.infer<typeof schema>

const EMPTY: FormValues = {
	availability_zone_id: "",
	sku: "",
	name: "",
	display_name: "",
	description: "",
	family: "standard",
	generation: "",
	architecture: "x86_64",
	hypervisor: "",
	vcpus: 1,
	ram_gb: 1,
	cpu_vendor: "",
	cpu_model: "",
	clock_ghz: 0,
	gpu_count: 0,
	gpu_type: "",
	local_disk_gb: 0,
	default_boot_disk_gb: 0,
	max_data_disks: 0,
	max_nics: 0,
	bandwidth_gbps: 0,
	network_tier: "",
	ipv4_included: 0,
	ipv6_supported: false,
	baseline_iops: 0,
	burst_iops: 0,
	features: "",
	price_hourly: 0,
	price_monthly: 0,
	price_yearly: 0,
	price_spot_hourly: 0,
	price_reserved_monthly: 0,
	price_reserved_yearly: 0,
	setup_fee: 0,
	currency: "INR",
	billing_unit: "hour",
	billing_increment_seconds: 3600,
	tax_inclusive: false,
	sort_order: 0,
	is_active: true,
}

// Map an existing VM price record onto the editable form shape.
function toFormValues(p: VMPrice): FormValues {
	return {
		availability_zone_id: p.availability_zone_id,
		sku: p.sku ?? "",
		name: p.name,
		display_name: p.display_name ?? "",
		description: p.description ?? "",
		family: p.family,
		generation: p.generation ?? "",
		architecture: p.architecture,
		hypervisor: p.hypervisor ?? "",
		vcpus: p.vcpus,
		ram_gb: p.ram_gb,
		cpu_vendor: p.cpu_vendor ?? "",
		cpu_model: p.cpu_model ?? "",
		clock_ghz: p.clock_ghz,
		gpu_count: p.gpu_count,
		gpu_type: p.gpu_type ?? "",
		local_disk_gb: p.local_disk_gb,
		default_boot_disk_gb: p.default_boot_disk_gb,
		max_data_disks: p.max_data_disks,
		max_nics: p.max_nics,
		bandwidth_gbps: p.bandwidth_gbps,
		network_tier: p.network_tier ?? "",
		ipv4_included: p.ipv4_included,
		ipv6_supported: p.ipv6_supported,
		baseline_iops: p.baseline_iops,
		burst_iops: p.burst_iops,
		features: p.features ?? "",
		price_hourly: p.price_hourly,
		price_monthly: p.price_monthly,
		price_yearly: p.price_yearly,
		price_spot_hourly: p.price_spot_hourly,
		price_reserved_monthly: p.price_reserved_monthly,
		price_reserved_yearly: p.price_reserved_yearly,
		setup_fee: p.setup_fee,
		currency: p.currency || "INR",
		billing_unit: p.billing_unit,
		billing_increment_seconds: p.billing_increment_seconds,
		tax_inclusive: p.tax_inclusive,
		sort_order: p.sort_order,
		is_active: p.is_active,
	}
}

function isJSON(value: string) {
	try {
		JSON.parse(value)
		return true
	} catch {
		return false
	}
}

function optionalString(value: string) {
	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : undefined
}

export function VMPriceFormPage() {
    useScreen("superadmin.v-m-price-form")
	const { t } = useTranslation()
	const navigate = useNavigate()
	const { id } = useParams()
	const isEdit = Boolean(id)
	const { mutate: save, isPending } = useSaveVMPrice()
	const { data: azs = [], isLoading: azLoading } = useAdminAvailabilityZones()
	const { data: prices = [] } = useAdminVMPrices()
	const existing = id ? prices.find((p) => p.id === id) : undefined

	const back = () => void navigate(LIST_PATH)

	const form = useForm<z.input<typeof schema>, unknown, FormValues>({
		resolver: zodResolver(schema),
		defaultValues: EMPTY,
		mode: "onTouched",
	})

	// Prefill the form once the record being edited is available. We also wait for
	// the availability-zone options to finish loading: the AZ field is a controlled
	// Radix <Select> and applying a value before its matching <SelectItem> exists
	// makes the select drop it, so the row's AZ would silently reset to empty.
	useEffect(() => {
		if (existing && !azLoading) form.reset(toFormValues(existing))
	}, [existing, azLoading, form])

	const azCode = useMemo(() => {
		const byId = new Map(azs.map((a) => [a.id, a.code]))
		return (azId: string) => byId.get(azId) ?? azId
	}, [azs])

	const steps = useMemo<WizardStep<FormValues>[]>(
		() => [
			{
				id: "flavor",
				title: t("superAdmin.vmPrices.wizard.flavor"),
				description: t("superAdmin.vmPrices.wizard.flavorDesc"),
				fields: [
					"availability_zone_id",
					"sku",
					"name",
					"display_name",
					"description",
					"family",
					"generation",
					"architecture",
					"hypervisor",
					"sort_order",
				],
				render: (f) => <FlavorStep form={f} />,
				reviewItems: (v) => [
					{
						label: t("superAdmin.vmPrices.fields.availabilityZone"),
						value: azCode(v.availability_zone_id),
						mono: true,
					},
					{ label: "SKU", value: v.sku.length > 0 ? v.sku : "—", mono: true },
					{ label: t("superAdmin.vmPrices.fields.name"), value: v.name, mono: true },
					{
						label: "Display name",
						value: v.display_name.length > 0 ? v.display_name : "—",
					},
					{
						label: t("superAdmin.vmPrices.fields.family"),
						value: t(`superAdmin.vmPrices.family.${v.family}`),
					},
					{ label: "Architecture", value: v.architecture, mono: true },
				],
			},
			{
				id: "specs",
				title: t("superAdmin.vmPrices.wizard.specs"),
				description: t("superAdmin.vmPrices.wizard.specsDesc"),
				fields: [
					"vcpus",
					"ram_gb",
					"cpu_vendor",
					"cpu_model",
					"clock_ghz",
					"gpu_count",
					"gpu_type",
					"local_disk_gb",
					"default_boot_disk_gb",
					"max_data_disks",
					"max_nics",
					"bandwidth_gbps",
					"network_tier",
					"ipv4_included",
					"ipv6_supported",
					"baseline_iops",
					"burst_iops",
				],
				render: (f) => <SpecsStep form={f} />,
				reviewItems: (v) => [
					{
						label: t("superAdmin.vmPrices.fields.vcpus"),
						value: String(v.vcpus),
						mono: true,
					},
					{
						label: t("superAdmin.vmPrices.fields.ram"),
						value: `${String(v.ram_gb)} GB`,
						mono: true,
					},
					{
						label: t("superAdmin.vmPrices.fields.gpuCount"),
						value: String(v.gpu_count),
						mono: true,
					},
					{
						label: t("superAdmin.vmPrices.fields.gpuType"),
						value: v.gpu_type.length > 0 ? v.gpu_type : "—",
						mono: true,
					},
					{
						label: t("superAdmin.vmPrices.fields.bandwidth"),
						value: String(v.bandwidth_gbps),
						mono: true,
					},
					{
						label: "Boot disk",
						value: `${String(v.default_boot_disk_gb)} GB`,
						mono: true,
					},
					{ label: "NICs", value: String(v.max_nics), mono: true },
				],
			},
			{
				id: "pricing",
				title: t("superAdmin.vmPrices.wizard.pricing"),
				description: t("superAdmin.vmPrices.wizard.pricingDesc"),
				fields: [
					"price_hourly",
					"price_monthly",
					"price_yearly",
					"price_spot_hourly",
					"price_reserved_monthly",
					"price_reserved_yearly",
					"setup_fee",
					"currency",
					"billing_unit",
					"billing_increment_seconds",
					"tax_inclusive",
					"features",
				],
				render: (f) => <PricingStep form={f} />,
				reviewItems: (v) => [
					{
						label: t("superAdmin.vmPrices.fields.priceHourly"),
						value: `${v.currency} ${String(v.price_hourly)}`,
						mono: true,
					},
					{
						label: t("superAdmin.vmPrices.fields.priceMonthly"),
						value: `${v.currency} ${String(v.price_monthly)}`,
						mono: true,
					},
					{
						label: t("superAdmin.vmPrices.fields.priceYearly"),
						value: `${v.currency} ${String(v.price_yearly)}`,
						mono: true,
					},
					{
						label: "Billing unit",
						value: `${v.billing_unit} / ${String(v.billing_increment_seconds)}s`,
						mono: true,
					},
				],
			},
		],
		[t, azCode]
	)

	const onSubmit = (values: FormValues) => {
		if (isEdit && id) {
			// Full edit: send every field so cleared text fields actually clear.
			const payload: UpdateVMPriceRequest = {
				availability_zone_id: values.availability_zone_id,
				sku: values.sku.trim(),
				name: values.name,
				display_name: values.display_name.trim(),
				description: values.description.trim(),
				family: values.family,
				generation: values.generation.trim(),
				architecture: values.architecture,
				hypervisor: values.hypervisor.trim(),
				vcpus: values.vcpus,
				ram_gb: values.ram_gb,
				cpu_vendor: values.cpu_vendor.trim(),
				cpu_model: values.cpu_model.trim(),
				clock_ghz: values.clock_ghz,
				gpu_count: values.gpu_count,
				gpu_type: values.gpu_type.trim(),
				local_disk_gb: values.local_disk_gb,
				default_boot_disk_gb: values.default_boot_disk_gb,
				max_data_disks: values.max_data_disks,
				max_nics: values.max_nics,
				bandwidth_gbps: values.bandwidth_gbps,
				network_tier: values.network_tier.trim(),
				ipv4_included: values.ipv4_included,
				ipv6_supported: values.ipv6_supported,
				baseline_iops: values.baseline_iops,
				burst_iops: values.burst_iops,
				features: optionalString(values.features),
				price_hourly: values.price_hourly,
				price_monthly: values.price_monthly,
				price_yearly: values.price_yearly,
				price_spot_hourly: values.price_spot_hourly,
				price_reserved_monthly: values.price_reserved_monthly,
				price_reserved_yearly: values.price_reserved_yearly,
				setup_fee: values.setup_fee,
				currency: values.currency.trim() || "INR",
				billing_unit: values.billing_unit,
				billing_increment_seconds: values.billing_increment_seconds,
				tax_inclusive: values.tax_inclusive,
				sort_order: values.sort_order,
				is_active: values.is_active,
			}
			save({ id, payload }, { onSuccess: back })
			return
		}

		const payload: CreateVMPriceRequest = {
			availability_zone_id: values.availability_zone_id,
			sku: optionalString(values.sku),
			name: values.name,
			display_name: optionalString(values.display_name),
			description: optionalString(values.description),
			family: values.family,
			generation: optionalString(values.generation),
			architecture: values.architecture,
			hypervisor: optionalString(values.hypervisor),
			vcpus: values.vcpus,
			ram_gb: values.ram_gb,
			cpu_vendor: optionalString(values.cpu_vendor),
			cpu_model: optionalString(values.cpu_model),
			clock_ghz: values.clock_ghz,
			gpu_count: values.gpu_count,
			gpu_type: optionalString(values.gpu_type),
			local_disk_gb: values.local_disk_gb,
			default_boot_disk_gb: values.default_boot_disk_gb,
			max_data_disks: values.max_data_disks,
			max_nics: values.max_nics,
			bandwidth_gbps: values.bandwidth_gbps,
			network_tier: optionalString(values.network_tier),
			ipv4_included: values.ipv4_included,
			ipv6_supported: values.ipv6_supported,
			baseline_iops: values.baseline_iops,
			burst_iops: values.burst_iops,
			features: optionalString(values.features),
			price_hourly: values.price_hourly,
			price_monthly: values.price_monthly,
			price_yearly: values.price_yearly,
			price_spot_hourly: values.price_spot_hourly,
			price_reserved_monthly: values.price_reserved_monthly,
			price_reserved_yearly: values.price_reserved_yearly,
			setup_fee: values.setup_fee,
			currency: optionalString(values.currency),
			billing_unit: values.billing_unit,
			billing_increment_seconds: values.billing_increment_seconds,
			tax_inclusive: values.tax_inclusive,
			sort_order: values.sort_order,
		}
		save({ payload }, { onSuccess: back })
	}

	return (
		<div>
			<PageHeader
				icon={Cpu}
				breadcrumbs={[
					{ label: t("superAdmin.title") },
					{ label: t("superAdmin.vmPrices.title"), to: LIST_PATH },
					{
						label: isEdit
							? t("superAdmin.vmPrices.editTitle")
							: t("superAdmin.vmPrices.createTitle"),
					},
				]}
				title={
					isEdit
						? t("superAdmin.vmPrices.editTitle")
						: t("superAdmin.vmPrices.createTitle")
				}
				description={t("superAdmin.vmPrices.formSubtitle")}
			/>

			<CreateWizard<FormValues, z.input<typeof schema>>
				steps={steps}
				form={form}
				submitLabel={
					isEdit ? t("superAdmin.actions.save") : t("superAdmin.actions.create")
				}
				isSubmitting={isPending}
				onCancel={back}
				onSubmit={onSubmit}
			/>
		</div>
	)
}

/* ── Steps ─────────────────────────────────────────────────────────────── */

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

function FlavorStep({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
	const { t } = useTranslation()
	const { data: azs = [], isLoading } = useAdminAvailabilityZones()
	const noAZs = !isLoading && azs.length === 0

	return (
		<div className="space-y-5">
			<div className="space-y-1.5">
				<FieldLabel>{t("superAdmin.vmPrices.fields.availabilityZone")} *</FieldLabel>
				<Controller
					control={form.control}
					name="availability_zone_id"
					render={({ field }) => {
						// Render the label ourselves: Radix <SelectValue> only learns an
						// item's text once it has been mounted (items mount lazily on open),
						// so a value set programmatically wouldn't display until first opened.
						const selected = azs.find((a) => String(a.id) === field.value)
						return (
							<Select
								value={field.value ?? ""}
								onValueChange={field.onChange}
								disabled={noAZs}
							>
								<SelectTrigger className="w-full">
									{selected ? (
										<span>{selected.code}</span>
									) : (
										<span className="text-muted-foreground">
											{t(
												"superAdmin.vmPrices.fields.availabilityZonePlaceholder"
											)}
										</span>
									)}
								</SelectTrigger>
								<SelectContent>
									{azs.length === 0 ? (
										<div className="px-2 py-1.5 text-xs text-muted-foreground">
											{isLoading
												? t("common.loading")
												: t("superAdmin.vmPrices.fields.noAZs")}
										</div>
									) : (
										azs.map((a) => (
											<SelectItem key={a.id} value={String(a.id)}>
												{a.code}
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
						)
					}}
				/>
				<FieldError message={form.formState.errors.availability_zone_id?.message} />
			</div>

			<div className="space-y-1.5">
				<FieldLabel>{t("superAdmin.vmPrices.fields.name")} *</FieldLabel>
				<Input {...form.register("name")} placeholder="s2.medium" className="font-mono" />
				<FieldError message={form.formState.errors.name?.message} />
			</div>

			<div className="grid sm:grid-cols-2 gap-4">
				<div className="space-y-1.5">
					<FieldLabel>SKU</FieldLabel>
					<Input
						{...form.register("sku")}
						placeholder="dd-standard-s2-medium-in1a"
						className="font-mono"
					/>
					<FieldError message={form.formState.errors.sku?.message} />
				</div>
				<div className="space-y-1.5">
					<FieldLabel>Display name</FieldLabel>
					<Input {...form.register("display_name")} placeholder="Standard S2 Medium" />
					<FieldError message={form.formState.errors.display_name?.message} />
				</div>
			</div>

			<div className="space-y-1.5">
				<FieldLabel>Description</FieldLabel>
				<Textarea {...form.register("description")} rows={3} />
				<FieldError message={form.formState.errors.description?.message} />
			</div>

			<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="space-y-1.5">
					<FieldLabel>{t("superAdmin.vmPrices.fields.family")}</FieldLabel>
					<Controller
						control={form.control}
						name="family"
						render={({ field }) => (
							<Select value={field.value} onValueChange={field.onChange}>
								<SelectTrigger className="w-full">
									<span>{t(`superAdmin.vmPrices.family.${field.value}`)}</span>
								</SelectTrigger>
								<SelectContent>
									{FAMILIES.map((f) => (
										<SelectItem key={f} value={f}>
											{t(`superAdmin.vmPrices.family.${f}`)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					/>
				</div>
				<div className="space-y-1.5">
					<FieldLabel>Generation</FieldLabel>
					<Input
						{...form.register("generation")}
						placeholder="gen-2"
						className="font-mono"
					/>
					<FieldError message={form.formState.errors.generation?.message} />
				</div>
				<div className="space-y-1.5">
					<FieldLabel>Architecture</FieldLabel>
					<Controller
						control={form.control}
						name="architecture"
						render={({ field }) => (
							<Select value={field.value} onValueChange={field.onChange}>
								<SelectTrigger className="w-full">
									<span>{field.value}</span>
								</SelectTrigger>
								<SelectContent>
									{ARCHITECTURES.map((a) => (
										<SelectItem key={a} value={a}>
											{a}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					/>
				</div>
				<div className="space-y-1.5">
					<FieldLabel>Sort order</FieldLabel>
					<Input type="number" min={0} {...form.register("sort_order")} />
					<FieldError message={form.formState.errors.sort_order?.message} />
				</div>
			</div>

			<div className="space-y-1.5 max-w-xs">
				<FieldLabel>Hypervisor</FieldLabel>
				<Input {...form.register("hypervisor")} placeholder="kvm" className="font-mono" />
				<FieldError message={form.formState.errors.hypervisor?.message} />
			</div>
		</div>
	)
}

function SpecsStep({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
	const { t } = useTranslation()
	return (
		<div className="space-y-5">
			<div className="grid sm:grid-cols-2 gap-4">
				<div className="space-y-1.5">
					<FieldLabel>{t("superAdmin.vmPrices.fields.vcpus")} *</FieldLabel>
					<Input type="number" min={1} {...form.register("vcpus")} />
					<FieldError message={form.formState.errors.vcpus?.message} />
				</div>
				<div className="space-y-1.5">
					<FieldLabel>{t("superAdmin.vmPrices.fields.ram")} *</FieldLabel>
					<Input type="number" min={0.5} step="any" {...form.register("ram_gb")} />
					<FieldError message={form.formState.errors.ram_gb?.message} />
				</div>
			</div>

			<div className="grid sm:grid-cols-3 gap-4">
				<div className="space-y-1.5">
					<FieldLabel>CPU vendor</FieldLabel>
					<Input {...form.register("cpu_vendor")} placeholder="AMD" />
					<FieldError message={form.formState.errors.cpu_vendor?.message} />
				</div>
				<div className="space-y-1.5">
					<FieldLabel>CPU model</FieldLabel>
					<Input {...form.register("cpu_model")} placeholder="EPYC 9554" />
					<FieldError message={form.formState.errors.cpu_model?.message} />
				</div>
				<div className="space-y-1.5">
					<FieldLabel>Clock GHz</FieldLabel>
					<Input type="number" min={0} step="any" {...form.register("clock_ghz")} />
					<FieldError message={form.formState.errors.clock_ghz?.message} />
				</div>
			</div>

			<div className="grid sm:grid-cols-2 gap-4">
				<div className="space-y-1.5">
					<FieldLabel>{t("superAdmin.vmPrices.fields.gpuCount")}</FieldLabel>
					<Input type="number" min={0} {...form.register("gpu_count")} />
					<FieldError message={form.formState.errors.gpu_count?.message} />
				</div>
				<div className="space-y-1.5">
					<FieldLabel>{t("superAdmin.vmPrices.fields.gpuType")}</FieldLabel>
					<Input
						{...form.register("gpu_type")}
						placeholder="A100"
						className="font-mono"
					/>
					<FieldError message={form.formState.errors.gpu_type?.message} />
				</div>
			</div>

			<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="space-y-1.5">
					<FieldLabel>Local disk GB</FieldLabel>
					<Input type="number" min={0} {...form.register("local_disk_gb")} />
					<FieldError message={form.formState.errors.local_disk_gb?.message} />
				</div>
				<div className="space-y-1.5">
					<FieldLabel>Boot disk GB</FieldLabel>
					<Input type="number" min={0} {...form.register("default_boot_disk_gb")} />
					<FieldError message={form.formState.errors.default_boot_disk_gb?.message} />
				</div>
				<div className="space-y-1.5">
					<FieldLabel>Max data disks</FieldLabel>
					<Input type="number" min={0} {...form.register("max_data_disks")} />
					<FieldError message={form.formState.errors.max_data_disks?.message} />
				</div>
				<div className="space-y-1.5">
					<FieldLabel>Max NICs</FieldLabel>
					<Input type="number" min={0} {...form.register("max_nics")} />
					<FieldError message={form.formState.errors.max_nics?.message} />
				</div>
			</div>

			<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="space-y-1.5">
					<FieldLabel>{t("superAdmin.vmPrices.fields.bandwidth")}</FieldLabel>
					<Input type="number" min={0} step="any" {...form.register("bandwidth_gbps")} />
					<FieldError message={form.formState.errors.bandwidth_gbps?.message} />
				</div>
				<div className="space-y-1.5">
					<FieldLabel>Network tier</FieldLabel>
					<Input {...form.register("network_tier")} placeholder="premium" />
					<FieldError message={form.formState.errors.network_tier?.message} />
				</div>
				<div className="space-y-1.5">
					<FieldLabel>IPv4 included</FieldLabel>
					<Input type="number" min={0} {...form.register("ipv4_included")} />
					<FieldError message={form.formState.errors.ipv4_included?.message} />
				</div>
				<div className="flex items-center gap-3 pt-6">
					<Controller
						control={form.control}
						name="ipv6_supported"
						render={({ field }) => (
							<Switch checked={field.value} onCheckedChange={field.onChange} />
						)}
					/>
					<FieldLabel>IPv6 supported</FieldLabel>
				</div>
			</div>

			<div className="grid sm:grid-cols-2 gap-4">
				<div className="space-y-1.5">
					<FieldLabel>Baseline IOPS</FieldLabel>
					<Input type="number" min={0} {...form.register("baseline_iops")} />
					<FieldError message={form.formState.errors.baseline_iops?.message} />
				</div>
				<div className="space-y-1.5">
					<FieldLabel>Burst IOPS</FieldLabel>
					<Input type="number" min={0} {...form.register("burst_iops")} />
					<FieldError message={form.formState.errors.burst_iops?.message} />
				</div>
			</div>
		</div>
	)
}

function PricingStep({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
	const { t } = useTranslation()
	return (
		<div className="space-y-5">
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div className="space-y-1.5">
					<FieldLabel>{t("superAdmin.vmPrices.fields.priceHourly")} *</FieldLabel>
					<Input type="number" min={0} step="any" {...form.register("price_hourly")} />
					<FieldError message={form.formState.errors.price_hourly?.message} />
				</div>
				<div className="space-y-1.5">
					<FieldLabel>{t("superAdmin.vmPrices.fields.priceMonthly")}</FieldLabel>
					<Input type="number" min={0} step="any" {...form.register("price_monthly")} />
					<FieldError message={form.formState.errors.price_monthly?.message} />
				</div>
				<div className="space-y-1.5">
					<FieldLabel>{t("superAdmin.vmPrices.fields.priceYearly")}</FieldLabel>
					<Input type="number" min={0} step="any" {...form.register("price_yearly")} />
					<FieldError message={form.formState.errors.price_yearly?.message} />
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div className="space-y-1.5">
					<FieldLabel>Spot hourly</FieldLabel>
					<Input
						type="number"
						min={0}
						step="any"
						{...form.register("price_spot_hourly")}
					/>
					<FieldError message={form.formState.errors.price_spot_hourly?.message} />
				</div>
				<div className="space-y-1.5">
					<FieldLabel>Reserved monthly</FieldLabel>
					<Input
						type="number"
						min={0}
						step="any"
						{...form.register("price_reserved_monthly")}
					/>
					<FieldError message={form.formState.errors.price_reserved_monthly?.message} />
				</div>
				<div className="space-y-1.5">
					<FieldLabel>Reserved yearly</FieldLabel>
					<Input
						type="number"
						min={0}
						step="any"
						{...form.register("price_reserved_yearly")}
					/>
					<FieldError message={form.formState.errors.price_reserved_yearly?.message} />
				</div>
			</div>

			<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="space-y-1.5">
					<FieldLabel>Setup fee</FieldLabel>
					<Input type="number" min={0} step="any" {...form.register("setup_fee")} />
					<FieldError message={form.formState.errors.setup_fee?.message} />
				</div>
				<div className="space-y-1.5">
					<FieldLabel>{t("superAdmin.vmPrices.fields.currency")}</FieldLabel>
					<Controller
						control={form.control}
						name="currency"
						render={({ field }) => (
							<CurrencySelect
								value={field.value}
								onValueChange={field.onChange}
								className="w-full"
							/>
						)}
					/>
					<FieldError message={form.formState.errors.currency?.message} />
				</div>
				<div className="space-y-1.5">
					<FieldLabel>Billing unit</FieldLabel>
					<Controller
						control={form.control}
						name="billing_unit"
						render={({ field }) => (
							<Select value={field.value} onValueChange={field.onChange}>
								<SelectTrigger className="w-full">
									<span>{field.value}</span>
								</SelectTrigger>
								<SelectContent>
									{BILLING_UNITS.map((unit) => (
										<SelectItem key={unit} value={unit}>
											{unit}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					/>
				</div>
				<div className="space-y-1.5">
					<FieldLabel>Billing increment seconds</FieldLabel>
					<Input type="number" min={1} {...form.register("billing_increment_seconds")} />
					<FieldError
						message={form.formState.errors.billing_increment_seconds?.message}
					/>
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-6">
				<div className="flex items-center gap-3">
					<Controller
						control={form.control}
						name="tax_inclusive"
						render={({ field }) => (
							<Switch checked={field.value} onCheckedChange={field.onChange} />
						)}
					/>
					<FieldLabel>Tax inclusive</FieldLabel>
				</div>
				<div className="flex items-center gap-3">
					<Controller
						control={form.control}
						name="is_active"
						render={({ field }) => (
							<Switch checked={field.value} onCheckedChange={field.onChange} />
						)}
					/>
					<FieldLabel>{t("superAdmin.fields.active")}</FieldLabel>
				</div>
			</div>

			<div className="space-y-1.5">
				<FieldLabel>Features JSON</FieldLabel>
				<Textarea
					{...form.register("features")}
					rows={5}
					placeholder='{"burstable":true}'
				/>
				<FieldError message={form.formState.errors.features?.message} />
			</div>
		</div>
	)
}
