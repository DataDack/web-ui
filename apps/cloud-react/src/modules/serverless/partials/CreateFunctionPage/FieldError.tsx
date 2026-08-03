/** Inline validation message under a field. Renders nothing when valid. */
export function FieldError({ message }: Readonly<{ message?: string }>) {
  if (!message) return null
  return <p className="text-destructive text-[11px]">{message}</p>
}
