import { useRef, type KeyboardEvent } from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

/**
 * A guided CIDR builder: four octet boxes + a prefix selector. Replaces the
 * free-text "10.4.2.1/16" input that is easy to fumble. Fully controlled — the
 * value is a normal CIDR string (`"10.0.0.0/16"`) so it drops into any Zod /
 * react-hook-form field unchanged. Reused across VPC, subnet and SG forms.
 */
export interface CidrInputProps {
  value: string
  onChange: (value: string) => void
  /** Prefix lengths offered in the selector. Default: common /8 … /32. */
  prefixOptions?: number[]
  className?: string
  "aria-label"?: string
  "aria-invalid"?: boolean
  disabled?: boolean
}

const DEFAULT_PREFIXES = [8, 12, 16, 20, 24, 28, 32]

function parseCidr(value: string): { octets: string[]; prefix: string } {
  const [ip = "", prefix = ""] = value.split("/")
  const parts = ip.split(".")
  return { octets: [0, 1, 2, 3].map((i) => parts[i] ?? ""), prefix }
}

function clampOctet(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 3)
  if (digits === "") return ""
  return String(Math.min(255, Number.parseInt(digits, 10)))
}

export function CidrInput({
  value,
  onChange,
  prefixOptions = DEFAULT_PREFIXES,
  className,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  disabled,
}: Readonly<CidrInputProps>) {
  const { octets, prefix } = parseCidr(value)
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const emit = (nextOctets: string[], nextPrefix: string) => {
    onChange(`${nextOctets.join(".")}/${nextPrefix}`)
  }

  const setOctet = (index: number, raw: string) => {
    const cleaned = clampOctet(raw)
    const next = [...octets]
    next[index] = cleaned
    emit(next, prefix)
    // Auto-advance once an octet is "full" (3 digits or > 25 can't grow).
    if (index < 3 && (cleaned.length === 3 || Number.parseInt(cleaned, 10) > 25)) {
      refs.current[index + 1]?.focus()
    }
  }

  const onOctetKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "." || e.key === "Tab") && !e.shiftKey && octets[index] && index < 3) {
      if (e.key === ".") e.preventDefault()
      refs.current[index + 1]?.focus()
    }
    if (e.key === "Backspace" && octets[index] === "" && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-input bg-transparent pl-1 pr-1 h-9 font-mono text-sm shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30",
        ariaInvalid && "border-destructive ring-destructive/20",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {octets.map((octet, index) => (
        // Octets are positional and fixed (always 4), so the index is a stable key.
        // eslint-disable-next-line react/no-array-index-key
        <div key={index} className="flex items-center">
          <input
            ref={(el) => {
              refs.current[index] = el
            }}
            value={octet}
            onChange={(e) => {
              setOctet(index, e.target.value)
            }}
            onKeyDown={(e) => {
              onOctetKeyDown(index, e)
            }}
            onFocus={(e) => {
              e.target.select()
            }}
            inputMode="numeric"
            placeholder="0"
            aria-label={`${ariaLabel ?? "CIDR"} octet ${String(index + 1)}`}
            disabled={disabled}
            className="w-7 bg-transparent text-center tabular-nums outline-none placeholder:text-muted-foreground/40"
          />
          {index < 3 && <span className="text-muted-foreground/60 select-none">.</span>}
        </div>
      ))}

      <span className="mx-1 h-4 w-px bg-border select-none" aria-hidden="true" />

      <Select
        value={prefix}
        onValueChange={(p) => {
          emit(octets, p)
        }}
        disabled={disabled}
      >
        <SelectTrigger
          aria-label={`${ariaLabel ?? "CIDR"} prefix length`}
          className="h-7 w-[3.5rem] gap-1 border-0 bg-transparent px-1.5 font-mono text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
        >
          <SelectValue placeholder="/__" />
        </SelectTrigger>
        <SelectContent>
          {prefixOptions.map((p) => (
            <SelectItem key={p} value={String(p)} className="font-mono">
              /{p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
