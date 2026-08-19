import type { ReactNode } from "react"

import { AlertTriangle, Boxes, ExternalLink, UserRound } from "lucide-react"
import { Link } from "react-router-dom"

import {
  Badge,
  Button,
  CopyButton,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  StatusBadge,
} from "@datadack/common-ui"

import type { AdminResource } from "../../superadmin.types"

const labels: Record<string, string> = {
  vm: "Virtual machine",
  vpc: "VPC",
  "managed-app": "Managed app",
  disk: "Disk",
  "static-ip": "Static IP",
  subnet: "Subnet",
  "ssh-key": "SSH key",
  "load-balancer": "Load balancer",
  "network-interface": "Network interface",
  "security-group": "Security group",
  router: "Router",
  "internet-gateway": "Internet gateway",
  "nat-gateway": "NAT gateway",
  "vpn-gateway": "VPN gateway",
}

function Field({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="space-y-1">
      <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

export function ResourceDetailSheet({
  resource,
  onClose,
}: Readonly<{ resource: AdminResource | null; onClose: () => void }>) {
  return (
    <Sheet
      open={!!resource}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent side="right" className="flex w-full max-w-[620px] flex-col gap-0 p-0">
        <SheetHeader className="shrink-0 px-6 py-5">
          <div className="flex items-start gap-3 pr-8">
            <div className="mt-0.5 rounded-md border border-border bg-muted p-2">
              <Boxes className="size-4" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="truncate">{resource?.name}</SheetTitle>
              <SheetDescription>
                {resource ? (labels[resource.type] ?? resource.type) : "Resource details"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <Separator />
        {resource && (
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={resource.status?.trim() ? resource.status : "unknown"} />
              <Badge variant="outline">{resource.service}</Badge>
              {resource.region && <Badge variant="secondary">{resource.region}</Badge>}
            </div>
            {resource.failure_reason && (
              <section
                className="rounded-lg border border-status-danger/40 bg-status-danger/10 p-4"
                aria-labelledby="resource-failure"
              >
                <div className="flex gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-danger" />
                  <div>
                    <h3 id="resource-failure" className="text-sm font-semibold">
                      Provisioning failure
                    </h3>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {resource.failure_reason}
                    </p>
                  </div>
                </div>
              </section>
            )}
            <section aria-labelledby="identity-title">
              <h3 id="identity-title" className="mb-3 text-sm font-semibold">
                Identity
              </h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Resource ID">
                  <CopyButton value={resource.id} className="max-w-full" />
                </Field>
                <Field label="Type">{labels[resource.type] ?? resource.type}</Field>
                <Field label="Service">{resource.service}</Field>
                <Field label="Last updated">
                  {resource.updated_at ? new Date(resource.updated_at).toLocaleString() : "—"}
                </Field>
              </dl>
            </section>
            <Separator />
            <section aria-labelledby="ownership-title">
              <h3 id="ownership-title" className="mb-3 text-sm font-semibold">
                Ownership
              </h3>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Account">
                  <Link
                    className="inline-flex items-center gap-1 text-link hover:underline"
                    to={`/admin/accounts/${resource.account_id}/resources`}
                  >
                    {resource.account_name}
                    <ExternalLink className="size-3" />
                  </Link>
                  <div className="font-mono text-xs text-muted-foreground">
                    {resource.account_number}
                  </div>
                </Field>
                <Field label="Organization ID">
                  {resource.organization_id ? (
                    <span className="font-mono text-xs break-all">{resource.organization_id}</span>
                  ) : (
                    "Individual account"
                  )}
                </Field>
              </dl>
              <div className="mt-4 space-y-2">
                {resource.owners.length ? (
                  resource.owners.map((owner) => (
                    <Link
                      key={owner.id}
                      to={`/admin/users/${owner.id}`}
                      className="flex items-center gap-3 rounded-md border border-border p-3 hover:bg-muted/40"
                    >
                      <UserRound className="size-4" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">
                          {owner.name || "Unnamed owner"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {owner.email}
                        </span>
                      </span>
                      <ExternalLink className="ml-auto size-3" />
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No account owner is recorded.</p>
                )}
              </div>
            </section>
            {resource.meta?.length || Object.keys(resource.tags ?? {}).length ? (
              <>
                <Separator />
                <section aria-labelledby="configuration-title">
                  <h3 id="configuration-title" className="mb-3 text-sm font-semibold">
                    Configuration evidence
                  </h3>
                  {resource.meta?.length ? (
                    <ul className="space-y-2">
                      {resource.meta.filter(Boolean).map((value) => (
                        <li
                          key={value}
                          className="rounded-md bg-muted/50 px-3 py-2 font-mono text-xs break-all"
                        >
                          {value}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(resource.tags ?? {}).map(([key, value]) => (
                      <Badge key={key} variant="outline">
                        <span className="text-muted-foreground">{key}=</span>
                        {value}
                      </Badge>
                    ))}
                  </div>
                </section>
              </>
            ) : null}
          </div>
        )}
        <Separator />
        <div className="flex shrink-0 justify-between gap-3 px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {resource && (
            <Button asChild variant="gold">
              <Link to={`/admin/accounts/${resource.account_id}/resources`}>
                Open account estate
                <ExternalLink className="size-4" />
              </Link>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
