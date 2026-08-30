import { Cpu, HardDrive, Info, Timer } from "lucide-react"

import { cn } from "@datadack/common-ui"

import type { RuntimeInfo } from "../../serverless.types"

interface SummaryAsideProps {
  name: string
  packageType: "image" | "blank"
  packageLabel: string
  imageUri: string
  runtime: string
  handler: string
  architecture: string
  memorySize: number
  timeout: number
  selectedRuntime: RuntimeInfo | undefined
}

function Row({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground shrink-0 text-[11px]">{label}</span>
      <span className="text-foreground min-w-0 truncate font-mono text-[11px]">{value}</span>
    </div>
  )
}

function Stat({
  icon: Icon,
  value,
  label,
}: Readonly<{ icon: typeof Cpu; value: string; label: string }>) {
  return (
    <div className="border-border/60 flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2.5">
      <Icon className="text-muted-foreground size-3.5" />
      <span className="font-mono text-[12px] font-semibold">{value}</span>
      <span className="text-muted-foreground text-[10px]">{label}</span>
    </div>
  )
}

/**
 * Live picture of the function being described, beside the form rather than
 * after it.
 *
 * The wizard asks its questions one step at a time, which means that without
 * this the only place the whole thing is visible is the review step — after
 * every decision has already been made. The memory and timeout tiles are not
 * asked for anywhere in the wizard, so this is the only place the defaults a
 * function is created with are stated before it exists.
 *
 * Deliberately has no submit button: the wizard footer owns advancing and
 * submitting, and a second way to submit sitting next to the first is a way to
 * submit from a step whose fields have not been validated yet.
 */
export function SummaryAside({
  name,
  packageType,
  packageLabel,
  imageUri,
  runtime,
  handler,
  architecture,
  memorySize,
  timeout,
  selectedRuntime,
}: Readonly<SummaryAsideProps>) {
  // An image carries its own entrypoint, so runtime/handler are not part of
  // what gets created and showing them would describe a function that is not
  // the one being made.
  const runtimeApplies = packageType !== "image"

  return (
    <div className="space-y-3">
      <div className="glass-1 border-border/60 space-y-3 rounded-xl border p-4">
        <h3 className="text-[13px] font-semibold">Summary</h3>
        <div className="space-y-1.5">
          <Row label="Name" value={name || "—"} />
          <Row label="Package" value={packageLabel} />
          {packageType === "image" && <Row label="Image" value={imageUri || "—"} />}
          {runtimeApplies && (
            <>
              <Row label="Runtime" value={runtime || "—"} />
              <Row label="Handler" value={handler || "—"} />
              <Row label="Architecture" value={architecture} />
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat icon={HardDrive} value={String(memorySize)} label="MB" />
        <Stat icon={Timer} value={`${String(timeout)}s`} label="timeout" />
        <Stat
          icon={Cpu}
          value={runtimeApplies ? architecture.replace("_", "") : "image"}
          label="arch"
        />
      </div>

      {/* Only worth a line when the catalog has actually told us something
          specific about the chosen runtime. */}
      {runtimeApplies && selectedRuntime && (
        <div
          className={cn(
            "border-border/60 flex items-start gap-2 rounded-lg border px-3 py-2.5",
            selectedRuntime.deprecatedForCreate && "border-destructive/30 bg-destructive/5",
          )}
        >
          <Info className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
          <p className="text-muted-foreground text-[11px]">
            {selectedRuntime.deprecatedForCreate
              ? `${selectedRuntime.name} can no longer be used for a new function.`
              : `${selectedRuntime.name} runs on ${selectedRuntime.osRelease} and supports ${selectedRuntime.architectures.join(" and ")}.`}
          </p>
        </div>
      )}
    </div>
  )
}
