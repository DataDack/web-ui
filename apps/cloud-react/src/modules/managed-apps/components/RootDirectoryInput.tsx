import { Input } from "@datadack/common-ui"
import { FolderTree } from "lucide-react"

import { FieldRow } from "@/components/console"

interface RootDirectoryInputProps {
  value: string
  onChange: (value: string) => void
  id?: string
  error?: string
}

/**
 * Where the app lives inside the repository.
 *
 * A plain input rather than a picker, deliberately. A directory browser needs a
 * repository tree listing, and no endpoint exposes one — a picker would either
 * be empty or invent paths. It becomes a `SmartSelect` over real candidate
 * roots when detection ships; until then the honest control is a text field
 * with a real placeholder.
 */
export function RootDirectoryInput({
  value,
  onChange,
  id = "root-dir",
  error,
}: Readonly<RootDirectoryInputProps>) {
  return (
    <FieldRow
      label="Root directory"
      htmlFor={id}
      error={error}
      description="Leave empty for the repository root. Set this for a monorepo — for example apps/web."
    >
      <div className="relative">
        <FolderTree className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          value={value}
          placeholder="./"
          className="pl-8 font-mono"
          onChange={(event) => {
            onChange(event.target.value)
          }}
        />
      </div>
    </FieldRow>
  )
}
