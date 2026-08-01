import { Label } from "@DataDack/common-ui"

export function FieldError({ message }: Readonly<{ message?: string }>) {
  if (!message) return null
  return <p className="text-[11px] text-destructive">{message}</p>
}

export function FieldLabel({
  children,
  required = true,
}: Readonly<{ children: string; required?: boolean }>) {
  return (
    <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
      {children}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </Label>
  )
}
