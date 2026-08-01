import type { Control, FieldPath, FieldValues } from "react-hook-form"

import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form"

import { SmartSelect } from "./SmartSelect"
import type { SmartSelectProps } from "./SmartSelect/smart-select.types"

type FieldOnlyProps<TItem> = Omit<
	SmartSelectProps<TItem>,
	"value" | "onValueChange" | "invalid" | "id"
>

interface SmartSelectFieldProps<
	TFieldValues extends FieldValues,
	TItem,
> extends FieldOnlyProps<TItem> {
	control: Control<TFieldValues>
	name: FieldPath<TFieldValues>
	label?: string
	description?: string
	required?: boolean
	/**
	 * Runs alongside the field's own onChange — for cascades, where choosing a
	 * repository also clears the branch and re-derives the build defaults.
	 */
	onPicked?: (value: string, item: TItem) => void
}

/**
 * A `SmartSelect` bound to react-hook-form, with the label / description /
 * error scaffolding every field in the console repeats by hand.
 *
 * The field owns validity: `invalid` comes from the form's error state rather
 * than from a prop the caller has to remember to wire.
 */
export function SmartSelectField<TFieldValues extends FieldValues, TItem>({
	control,
	name,
	label,
	description,
	required = false,
	onPicked,
	...selectProps
}: Readonly<SmartSelectFieldProps<TFieldValues, TItem>>) {
	return (
		<FormField
			control={control}
			name={name}
			render={({ field, fieldState }) => (
				<FormItem>
					{label && (
						<FormLabel className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
							{label}
							{required && <span className="ml-0.5 text-destructive">*</span>}
						</FormLabel>
					)}
					<FormControl>
						<SmartSelect<TItem>
							{...selectProps}
							id={field.name}
							value={typeof field.value === "string" ? field.value : undefined}
							invalid={fieldState.invalid}
							onValueChange={(next, item) => {
								field.onChange(next)
								onPicked?.(next, item)
							}}
						/>
					</FormControl>
					{description && <FormDescription>{description}</FormDescription>}
					<FormMessage />
				</FormItem>
			)}
		/>
	)
}
