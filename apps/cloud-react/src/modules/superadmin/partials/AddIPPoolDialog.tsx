import { useEffect, useMemo } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Network } from "lucide-react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import { CidrInput } from "@/components/console"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { Field } from "../components/form-fields"
import { describeCidr } from "../ip-utils"
import { useAdminAvailabilityZones, useSaveIPPool } from "../superadmin.hooks"
import type { CreateIPPoolRequest } from "../superadmin.types"

// Pools are stock blocks, so the prefix selector favours small ranges.
const POOL_PREFIXES = [22, 24, 25, 26, 27, 28, 29, 30, 31, 32]

const schema = z.object({
	cidr: z.string().refine((v) => !!describeCidr(v)?.info, "Enter a valid IPv4 CIDR block"),
	availability_zone_id: z.string().min(1, "Required"),
	name: z.string().max(100),
	gateway: z.string(),
	description: z.string().max(255),
})

type FormValues = z.infer<typeof schema>

const EMPTY: FormValues = {
	cidr: "",
	availability_zone_id: "",
	name: "",
	gateway: "",
	description: "",
}

function optional(value: string) {
	const trimmed = value.trim()
	return trimmed.length > 0 ? trimmed : undefined
}

interface Props {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function AddIPPoolDialog({ open, onOpenChange }: Readonly<Props>) {
	const { t } = useTranslation()
	const { mutate: save, isPending } = useSaveIPPool()
	const { data: azs = [] } = useAdminAvailabilityZones()

	const {
		register,
		handleSubmit,
		control,
		reset,
		formState: { errors },
	} = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY })

	useEffect(() => {
		if (open) reset(EMPTY)
	}, [open, reset])

	const cidr = useWatch({ control, name: "cidr" })
	const preview = useMemo(() => describeCidr(cidr), [cidr])

	const onSubmit = (values: FormValues) => {
		const payload: CreateIPPoolRequest = {
			cidr: values.cidr,
			availability_zone_id: values.availability_zone_id,
			name: optional(values.name),
			gateway: optional(values.gateway),
			description: optional(values.description),
		}
		save(
			{ payload },
			{
				onSuccess: () => {
					onOpenChange(false)
				},
			}
		)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="glass-3 gap-0 p-0 overflow-hidden sm:max-w-5xl">
				<DialogHeader className="px-6 py-5">
					<DialogTitle className="flex items-center gap-2">
						<Network className="size-4" />
						{t("superAdmin.staticIps.dialog.title")}
					</DialogTitle>
					<DialogDescription>
						{t("superAdmin.staticIps.dialog.subtitle")}
					</DialogDescription>
				</DialogHeader>

				<div className="grid md:grid-cols-2 border-t border-border-glass">
					{/* Left: the form */}
					<form
						onSubmit={(e) => void handleSubmit(onSubmit)(e)}
						className="flex flex-col gap-5 p-6 md:border-r border-border-glass"
					>
						<Field
							label={t("superAdmin.staticIps.dialog.cidr")}
							required
							error={errors.cidr?.message}
						>
							<Controller
								control={control}
								name="cidr"
								render={({ field }) => (
									<CidrInput
										value={field.value}
										onChange={field.onChange}
										prefixOptions={POOL_PREFIXES}
										aria-invalid={!!errors.cidr}
										aria-label={t("superAdmin.staticIps.dialog.cidr")}
									/>
								)}
							/>
						</Field>

						<Field
							label={t("superAdmin.staticIps.dialog.az")}
							required
							error={errors.availability_zone_id?.message}
						>
							<Controller
								control={control}
								name="availability_zone_id"
								render={({ field }) => (
									<Select
										value={field.value === "" ? undefined : field.value}
										onValueChange={field.onChange}
									>
										<SelectTrigger className="w-full">
											<SelectValue
												placeholder={t(
													"superAdmin.staticIps.dialog.azPlaceholder"
												)}
											/>
										</SelectTrigger>
										<SelectContent>
											{azs.map((a) => (
												<SelectItem key={a.id} value={a.id}>
													{a.code}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							/>
						</Field>

						<Field label={t("superAdmin.staticIps.dialog.name")} error={errors.name?.message}>
							<Input
								{...register("name")}
								placeholder={t("superAdmin.staticIps.dialog.namePlaceholder")}
							/>
						</Field>

						<Field
							label={t("superAdmin.staticIps.dialog.gateway")}
							error={errors.gateway?.message}
						>
							<Input
								{...register("gateway")}
								className="font-mono"
								placeholder={t("superAdmin.staticIps.dialog.gatewayPlaceholder")}
							/>
						</Field>

						<Field
							label={t("superAdmin.staticIps.dialog.description")}
							error={errors.description?.message}
						>
							<Textarea {...register("description")} rows={2} />
						</Field>

						<Button type="submit" disabled={isPending} className="mt-1 gap-2">
							{isPending && <Loader2 className="size-4 animate-spin" />}
							{t("superAdmin.staticIps.pools.add")}
						</Button>
					</form>

					{/* Right: live address preview */}
					<div className="flex flex-col bg-muted/30">
						<div className="px-6 py-4 border-b border-border-glass">
							<p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
								{t("superAdmin.staticIps.dialog.preview")}
							</p>
							{preview?.info ? (
								<p className="mt-1 text-sm font-medium text-foreground">
									{t("superAdmin.staticIps.dialog.usableSummary", {
										usable: preview.info.usableCount,
										total: preview.info.totalCount,
									})}
								</p>
							) : (
								<p className="mt-1 text-sm text-muted-foreground">
									{preview?.error ?? t("superAdmin.staticIps.dialog.previewEmpty")}
								</p>
							)}
						</div>

						{preview?.info && (
							<div className="grid grid-cols-3 gap-2 px-6 py-3 text-[11px] border-b border-border-glass">
								<PreviewMeta
									label={t("superAdmin.staticIps.dialog.network")}
									value={preview.info.network}
								/>
								<PreviewMeta
									label={t("superAdmin.staticIps.dialog.gatewayLabel")}
									value={preview.info.gateway}
								/>
								<PreviewMeta
									label={t("superAdmin.staticIps.dialog.broadcast")}
									value={preview.info.broadcast}
								/>
							</div>
						)}

						<div className="max-h-70 flex-1 overflow-y-auto px-6 py-3">
							{preview?.info ? (
								<ul className="grid grid-cols-2 gap-1.5 lg:grid-cols-3">
									{preview.info.hosts.map((host) => (
										<li
											key={host}
											className="rounded-md border border-border-glass bg-background/60 px-2 py-1 font-mono text-[12px] tabular-nums text-foreground"
										>
											{host}
										</li>
									))}
								</ul>
							) : (
								<div className="flex h-full min-h-35 items-center justify-center text-center text-xs text-muted-foreground">
									{t("superAdmin.staticIps.dialog.previewEmpty")}
								</div>
							)}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}

function PreviewMeta({ label, value }: Readonly<{ label: string; value: string }>) {
	return (
		<div className={cn("flex flex-col gap-0.5")}>
			<span className="text-muted-foreground">{label}</span>
			<span className="font-mono tabular-nums text-foreground">{value}</span>
		</div>
	)
}
