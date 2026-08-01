import { useMemo, useState } from "react"

import { FileUp, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

import { duplicateKeys, newEnvRow, type EnvRow } from "./env-types"
import { EnvImportSheet } from "./EnvImportSheet"
import { EnvVarRow } from "./EnvVarRow"

interface EnvVarEditorProps {
	rows: EnvRow[]
	onChange: (rows: EnvRow[]) => void
	/** Shown under the control — differs between create and settings. */
	description?: string
	label?: string
}

/**
 * The environment-variable editor: rows, `.env` import, live duplicate
 * detection.
 *
 * Importing merges by key rather than appending, so pasting a `.env` twice does
 * not produce two of everything — the second paste updates what the first one
 * created, which is what a user re-pasting a corrected file expects.
 */
export function EnvVarEditor({
	rows,
	onChange,
	description,
	label = "Environment variables",
}: Readonly<EnvVarEditorProps>) {
	const [importOpen, setImportOpen] = useState(false)
	const duplicates = useMemo(() => duplicateKeys(rows), [rows])

	const replaceRow = (next: EnvRow) => {
		onChange(rows.map((row) => (row.id === next.id ? next : row)))
	}

	const removeRow = (id: string) => {
		onChange(rows.filter((row) => row.id !== id))
	}

	const importEntries = (entries: { key: string; value: string }[]) => {
		const merged = [...rows]
		for (const entry of entries) {
			const existing = merged.findIndex((row) => row.key.trim() === entry.key)
			if (existing === -1) {
				merged.push(newEnvRow(entry.key, entry.value))
				continue
			}
			const current = merged.at(existing)
			if (!current) continue
			merged[existing] = {
				...current,
				value: entry.value,
				// Overwriting a saved variable is a real write.
				state: current.state === "stored" ? "edited" : current.state,
			}
		}
		onChange(merged)
	}

	return (
		<div className="space-y-2.5">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
					{label}
				</Label>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-7 gap-1.5 px-2 text-[12px]"
					onClick={() => {
						setImportOpen(true)
					}}
				>
					<FileUp className="size-3.5" />
					Import .env
				</Button>
			</div>

			{rows.length > 0 && (
				<div className="space-y-2">
					{rows.map((row) => (
						<EnvVarRow
							key={row.id}
							row={row}
							duplicate={duplicates.has(row.key.trim())}
							onChange={replaceRow}
							onRemove={() => {
								removeRow(row.id)
							}}
						/>
					))}
				</div>
			)}

			<Button
				type="button"
				variant="outline"
				size="sm"
				className="gap-1.5"
				onClick={() => {
					onChange([...rows, newEnvRow()])
				}}
			>
				<Plus className="size-3.5" />
				Add variable
			</Button>

			{description && <p className="text-[11px] text-muted-foreground">{description}</p>}

			<EnvImportSheet
				open={importOpen}
				onOpenChange={setImportOpen}
				onImport={importEntries}
			/>
		</div>
	)
}
