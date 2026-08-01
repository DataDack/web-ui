import type { ReactNode } from "react"

import { Label, Separator } from "@DataDack/common-ui"
import { useTranslation } from "react-i18next"

import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@datadack/common-ui"
/** Labelled form field with optional hint and validation error, matching the
 *  console's create-sheet styling. */
export function Field({
  label,
  required,
  error,
  hint,
  children,
}: Readonly<{
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: ReactNode
}>) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  )
}

/** Right-side sheet that scaffolds a create/edit form: header, scrollable body,
 *  and a sticky cancel/submit footer. */
export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  submitting,
  submitLabel,
  children,
}: Readonly<{
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onSubmit: (e: React.SyntheticEvent) => void
  submitting: boolean
  submitLabel: string
  children: ReactNode
}>) {
  const { t } = useTranslation()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[480px] p-0 flex flex-col gap-0">
        <SheetHeader className="px-6 py-5 shrink-0">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <Separator />
        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 px-6 py-5 space-y-5 overflow-y-auto">{children}</div>
          <Separator />
          <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onOpenChange(false)
              }}
            >
              {t("console.wizard.cancel")}
            </Button>
            <Button type="submit" variant="gold" disabled={submitting}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
