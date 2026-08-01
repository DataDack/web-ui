import { useMemo, useState } from "react"

import { Textarea } from "@DataDack/common-ui"
import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@datadack/common-ui"

import { parseDotEnv } from "./env-parse"

interface EnvImportSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (entries: { key: string; value: string }[]) => void
}

/**
 * Paste a `.env` file instead of typing twenty rows.
 *
 * The preview is the point. It states exactly what will be added, what was
 * ignored and why, before anything is committed — pasting a production `.env`
 * into a box and pressing a button you cannot see the result of is not a thing
 * anyone should be asked to do.
 */
export function EnvImportSheet({ open, onOpenChange, onImport }: Readonly<EnvImportSheetProps>) {
  const [text, setText] = useState("")
  const parsed = useMemo(() => parseDotEnv(text), [text])

  const close = () => {
    setText("")
    onOpenChange(false)
  }

  const skippedLabel =
    parsed.skipped.length === 1
      ? `1 line skipped (line ${String(parsed.skipped[0])})`
      : `${String(parsed.skipped.length)} lines skipped (lines ${parsed.skipped.join(", ")})`

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
        else onOpenChange(true)
      }}
    >
      <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Import from .env</SheetTitle>
          <SheetDescription>
            Paste the contents of a .env file. Comments and blank lines are ignored; repeated keys
            keep their last value.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
          <Textarea
            value={text}
            onChange={(event) => {
              setText(event.target.value)
            }}
            placeholder={"DATABASE_URL=postgres://…\nAPI_TOKEN=…\n# comments are ignored"}
            className="min-h-52 font-mono text-[12px]"
            aria-label="Paste .env contents"
          />

          {text.trim() !== "" && (
            <div className="glass-1 space-y-2 rounded-lg border border-border/60 p-3">
              <p className="text-[13px] font-medium">
                {parsed.entries.length === 1
                  ? "1 variable parsed"
                  : `${String(parsed.entries.length)} variables parsed`}
                {parsed.skipped.length > 0 && (
                  <span className="text-muted-foreground">, {skippedLabel}</span>
                )}
              </p>

              {parsed.duplicates.length > 0 && (
                <p className="flex items-start gap-1.5 text-[11px] text-status-warning">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                  Repeated in the paste, last value kept:{" "}
                  <span className="font-mono">{parsed.duplicates.join(", ")}</span>
                </p>
              )}

              {parsed.entries.length > 0 && (
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {parsed.entries.map((entry) => (
                    <li key={entry.key} className="flex items-baseline gap-2 font-mono text-[11px]">
                      <span className="shrink-0 text-foreground">{entry.key}</span>
                      <span className="truncate text-muted-foreground">
                        {entry.value === "" ? "(empty)" : "•".repeat(8)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="flex-row justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={parsed.entries.length === 0}
            onClick={() => {
              onImport(parsed.entries)
              close()
            }}
          >
            {parsed.entries.length === 1
              ? "Add 1 variable"
              : `Add ${String(parsed.entries.length)} variables`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
