import { useState } from "react"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@datadack/common-ui"

import { extractError } from "@/services/api/client"

import { ROUTE_TARGET_EMPTY, useRouteTargets } from "./route-targets"
import {
  ROUTE_TARGET_LABELS,
  ROUTE_TARGET_TYPES,
  useRouteTableActions,
  type NetworkRoute,
  type RouteTable,
  type RouteTargetType,
} from "../../route-tables"
import { cidrContains, cidrRange } from "../../vpc.utils"

// eslint-disable-next-line sonarjs/no-hardcoded-ip -- illustrative placeholder in an empty form field, never dialled
const EXAMPLE_CIDR = "10.60.0.0/16"

/**
 * Canonical masked form, the way the API stores it: 10.1.2.3/24 and 10.1.2.0/24
 * are one prefix, and only one of them can be in a table. Sending the masked
 * form means the duplicate check below sees what the server will see.
 */
function normalizeCIDR(raw: string): string | null {
  const value = raw.trim()
  const range = cidrRange(value)
  if (!range) return null
  const prefix = Number.parseInt(value.split("/")[1] ?? "", 10)
  return `${range.network}/${prefix}`
}

export function RouteDialog({
  table,
  route,
  open,
  onOpenChange,
}: Readonly<{
  table: RouteTable
  /** Absent when adding; the row being changed when editing. */
  route?: NetworkRoute
  open: boolean
  onOpenChange: (open: boolean) => void
}>) {
  const editing = route !== undefined
  const [destination, setDestination] = useState(route?.destination_cidr ?? "")
  const [targetType, setTargetType] = useState<RouteTargetType | "">(
    (route?.target_type as RouteTargetType | undefined) ?? "",
  )
  const [targetID, setTargetID] = useState(route?.target_id ?? "")
  const [touched, setTouched] = useState(false)
  const targets = useRouteTargets(table.vpc_id)
  const { createRoute, updateRoute } = useRouteTableActions()
  const mutation = editing ? updateRoute : createRoute

  const choices = targetType === "" ? [] : targets.options[targetType]
  const normalized = normalizeCIDR(destination)

  let targetPlaceholder = "Select a target"
  if (targetType === "") targetPlaceholder = "Choose a target type first"
  else if (targets.isLoading) targetPlaceholder = "Loading targets…"

  const destinationIssue = (() => {
    if (destination.trim() === "") return "A destination is required."
    if (!normalized) return `Enter an IPv4 CIDR block, for example ${EXAMPLE_CIDR}.`
    // The VPC's own prefix is connected inside the VRF and wins regardless of
    // what a row says, so the API refuses any destination that meets it. Both
    // directions are refused, and they are different mistakes: one is covered
    // by the local route, the other is the default route people reach for.
    if (cidrContains(table.cidr, normalized))
      return `${normalized} is inside this VPC's ${table.cidr}, which the local route already serves.`
    if (cidrContains(normalized, table.cidr))
      return `${normalized} spans this VPC's own ${table.cidr}. Destinations that cover the VPC range — 0.0.0.0/0 among them — are refused; route the specific prefixes you need instead.`
    const clash = table.routes.find(
      (row) => row.destination_cidr === normalized && row.id !== route?.id,
    )
    if (clash) return `This table already routes ${normalized}.`
    return null
  })()

  const ready = !destinationIssue && targetType !== "" && targetID !== ""

  const submit = () => {
    setTouched(true)
    // `ready` already carries "a target type is chosen", which narrows it here.
    if (!ready || !normalized) return
    const body = {
      destination_cidr: normalized,
      target_type: targetType,
      target_id: targetID,
    }
    const done = {
      onSuccess: () => {
        onOpenChange(false)
      },
    }
    if (editing) updateRoute.mutate({ tableID: table.id, routeID: route.id, ...body }, done)
    else createRoute.mutate({ tableID: table.id, ...body }, done)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!mutation.isPending) onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit route" : "Add route"}</DialogTitle>
          <DialogDescription>
            Send traffic for a destination outside {table.cidr} to a gateway or peering in{" "}
            {table.vpc_name}.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="route-destination">Destination</Label>
            <Input
              id="route-destination"
              required
              autoComplete="off"
              placeholder={EXAMPLE_CIDR}
              className="font-mono"
              aria-invalid={touched && !!destinationIssue}
              value={destination}
              onChange={(event) => {
                setDestination(event.target.value)
              }}
              onBlur={() => {
                setTouched(true)
              }}
            />
            {touched && destinationIssue ? (
              <p role="alert" className="text-sm text-destructive">
                {destinationIssue}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                An IPv4 prefix outside {table.cidr} — a peered VPC’s range, for instance.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="route-target-type">Target type</Label>
            <Select
              value={targetType}
              onValueChange={(value) => {
                setTargetType(value as RouteTargetType)
                setTargetID("")
              }}
            >
              <SelectTrigger id="route-target-type">
                <SelectValue placeholder="Select a target type" />
              </SelectTrigger>
              <SelectContent>
                {ROUTE_TARGET_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {ROUTE_TARGET_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="route-target">Target</Label>
            <Select
              value={targetID}
              onValueChange={(value) => {
                setTargetID(value)
                // A peering route almost always carries the peer's prefix, and
                // typing it back by hand is the step that gets it wrong.
                const peer = targets.byID.get(value)?.cidr
                if (peer && destination.trim() === "") setDestination(peer)
              }}
              disabled={targetType === "" || targets.isLoading || choices.length === 0}
            >
              <SelectTrigger id="route-target">
                <SelectValue placeholder={targetPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {choices.map((choice) => (
                  <SelectItem key={choice.id} value={choice.id}>
                    {choice.label}
                    {choice.hint && (
                      <span className="ml-2 text-muted-foreground">{choice.hint}</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {targets.isError && (
              <p role="alert" className="text-sm text-destructive">
                Targets could not be loaded.{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    targets.refetch()
                  }}
                >
                  Try again
                </button>
              </p>
            )}
            {targetType !== "" &&
              !targets.isLoading &&
              !targets.isError &&
              choices.length === 0 && (
                <p className="text-sm text-muted-foreground">{ROUTE_TARGET_EMPTY[targetType]}</p>
              )}
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            Instances and VPN gateways cannot be route targets: the fabric routes a VPC by peering
            imports and gateway egress, and has no next hop to install for them.
          </div>

          {mutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              {extractError(
                mutation.error,
                editing ? "The route could not be updated." : "The route could not be added.",
              )}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={mutation.isPending}
              onClick={() => {
                onOpenChange(false)
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gold"
              loading={mutation.isPending}
              disabled={!ready || mutation.isPending}
            >
              {editing ? "Save route" : "Add route"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
