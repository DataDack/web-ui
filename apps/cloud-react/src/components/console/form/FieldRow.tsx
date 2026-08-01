import type { ReactNode } from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FieldRowProps {
	label: ReactNode
	children: ReactNode
	/** Associates the label with the control. */
	htmlFor?: string
	description?: ReactNode
	error?: string
	required?: boolean
	/** Right-aligned slot on the label line — an override toggle, a hint. */
	aside?: ReactNode
	className?: string
}

/**
 * Label + control + description + error, on the console's spacing.
 *
 * This exists because the same block was hand-rolled at six places in the old
 * create wizard alone, each with its own class string, which is how a form ends
 * up with three different label sizes on one screen. Fields inside a
 * react-hook-form `FormField` should use `FormItem` instead — this is for
 * controls that are not RHF-bound.
 */
export function FieldRow({
	label,
	children,
	htmlFor,
	description,
	error,
	required = false,
	aside,
	className,
}: Readonly<FieldRowProps>) {
	return (
		<div className={cn("space-y-1.5", className)}>
			<div className="flex items-center justify-between gap-2">
				<Label
					htmlFor={htmlFor}
					className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
				>
					{label}
					{required && <span className="ml-0.5 text-destructive">*</span>}
				</Label>
				{aside}
			</div>
			{children}
			{description && <p className="text-[11px] text-muted-foreground">{description}</p>}
			{error && <p className="text-[11px] text-destructive">{error}</p>}
		</div>
	)
}
