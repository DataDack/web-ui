import { useEffect, useMemo, useState } from "react"

import {
  Badge,
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@datadack/common-ui"
import { CheckCircle2, PlugZap, Server, XCircle } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"

import { PageHeader, Section } from "@/components/console"

import { HOSTING_ADMIN_ROUTES } from "../hosting.constants"
import {
  useHostingModules,
  useHostingServer,
  useHostingServerGroups,
  useSaveHostingServer,
  useTestHostingServer,
} from "../hosting.hooks"
import type { Nameserver, ProbeResult, SaveServerRequest } from "../hosting.types"

/** Five ordered nameserver slots, exactly as the WHMCS form presents them. */
const NAMESERVER_SLOTS = 5

const EMPTY_FORM: SaveServerRequest = {
  name: "",
  hostname: "",
  ip_address: "",
  assigned_ips: [],
  monthly_cost: 0,
  datacenter: "",
  max_accounts: 0,
  status_url: "",
  disabled: false,
  nameservers: Array.from({ length: NAMESERVER_SLOTS }, () => ({ host: "", ip: "" })),
  module_key: "cpanel",
  username: "root",
  secure: true,
  port: 2087,
  sso_access: "unrestricted",
  group_id: null,
}

/**
 * Add / edit a hosting server.
 *
 * The layout is a deliberate copy of the WHMCS "Add Server" page — Server,
 * Nameservers, Server Details, SSO Access Control — so an operator migrating
 * across has nothing to re-learn. The credential inputs are NOT rendered from a
 * hard-coded list: they come from the selected module's descriptor, which is
 * what makes adding Plesk a backend-only change.
 */
export function HostingServerFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const { data: existing, isLoading } = useHostingServer(id)
  const { data: modules = [] } = useHostingModules()
  const { data: groups = [] } = useHostingServerGroups()
  const save = useSaveHostingServer(id)
  const test = useTestHostingServer()

  const [form, setForm] = useState<SaveServerRequest>(EMPTY_FORM)
  const [probe, setProbe] = useState<ProbeResult | null>(null)
  const [assignedIPsText, setAssignedIPsText] = useState("")

  // Credentials are never sent back by the API, so the inputs start blank and
  // are only included in the payload when the operator actually types one.
  // `undefined` means "leave unchanged"; an empty string would clear it.
  const [password, setPassword] = useState<string | undefined>(undefined)
  const [apiToken, setApiToken] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!existing) return
    const slots = [...existing.nameservers]
    while (slots.length < NAMESERVER_SLOTS) slots.push({ host: "", ip: "" })
    setForm({
      name: existing.name,
      hostname: existing.hostname,
      ip_address: existing.ip_address,
      assigned_ips: existing.assigned_ips,
      monthly_cost: existing.monthly_cost,
      datacenter: existing.datacenter,
      max_accounts: existing.max_accounts,
      status_url: existing.status_url,
      disabled: existing.disabled,
      nameservers: slots.slice(0, NAMESERVER_SLOTS),
      module_key: existing.module_key,
      username: existing.username,
      secure: existing.secure,
      port: existing.port,
      sso_access: existing.sso_access,
      sso_allowed: existing.sso_allowed,
      group_id: existing.group_id,
      status: existing.status === "MAINTENANCE" ? "MAINTENANCE" : "ACTIVE",
    })
    setAssignedIPsText(existing.assigned_ips.join("\n"))
  }, [existing])

  const activeModule = useMemo(
    () => modules.find((m) => m.key === form.module_key),
    [modules, form.module_key],
  )

  const set = <K extends keyof SaveServerRequest>(key: K, value: SaveServerRequest[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const setNameserver = (index: number, patch: Partial<Nameserver>) => {
    setForm((f) => ({
      ...f,
      nameservers: f.nameservers.map((ns, i) => (i === index ? { ...ns, ...patch } : ns)),
    }))
  }

  const payload = (): SaveServerRequest => ({
    ...form,
    // One address per line is how WHMCS takes them and how operators paste them.
    assigned_ips: assignedIPsText
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean),
    nameservers: form.nameservers.filter((ns) => ns.host.trim() !== ""),
    password,
    api_token: apiToken,
  })

  const submit = () => {
    save.mutate(payload(), {
      onSuccess: () => void navigate(HOSTING_ADMIN_ROUTES.servers),
    })
  }

  // Test Connection only works against a SAVED server: the credentials live
  // encrypted on the row, and the backend is the only thing that can decrypt
  // them. Testing a draft would mean shipping a plaintext token in a request.
  const runTest = () => {
    if (!id) return
    test.mutate(id, { onSuccess: setProbe })
  }

  if (isEdit && isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading provider…</p>
  }

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title={isEdit ? `Edit ${existing?.name ?? "provider"}` : "Add provider"}
        description="Connection details for a WHM/cPanel machine."
        icon={Server}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => void navigate(HOSTING_ADMIN_ROUTES.servers)}>
              Cancel
            </Button>
            {isEdit && (
              <Button variant="outline" onClick={runTest} disabled={test.isPending}>
                <PlugZap className="size-4" />
                {test.isPending ? "Testing…" : "Test connection"}
              </Button>
            )}
            <Button onClick={submit} disabled={save.isPending || form.hostname.trim() === ""}>
              {saveLabel(save.isPending, isEdit)}
            </Button>
          </div>
        }
      />

      {probe && <ProbeBanner probe={probe} />}

      <Section title="Provider" variant="panel">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name" hint="How this box is labelled in the console.">
            <Input
              value={form.name}
              onChange={(e) => {
                set("name", e.target.value)
              }}
              placeholder="server"
            />
          </Field>
          <Field label="Hostname" required>
            <Input
              value={form.hostname}
              onChange={(e) => {
                set("hostname", e.target.value)
              }}
              placeholder="server.example.com"
            />
          </Field>
          <Field label="IP address">
            <Input
              value={form.ip_address}
              onChange={(e) => {
                set("ip_address", e.target.value)
              }}
              placeholder="203.0.113.10"
            />
          </Field>
          <Field label="Datacenter / NOC">
            <Input
              value={form.datacenter}
              onChange={(e) => {
                set("datacenter", e.target.value)
              }}
              placeholder="Mumbai — DC1"
            />
          </Field>
          <Field label="Assigned IP addresses" hint="One per line. Offered as dedicated IPs.">
            <Textarea
              rows={4}
              value={assignedIPsText}
              onChange={(e) => {
                setAssignedIPsText(e.target.value)
              }}
              placeholder={"203.0.113.11\n203.0.113.12"}
            />
          </Field>
          <div className="grid gap-4">
            <Field label="Monthly cost" hint="What this box costs you. Reporting only.">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.monthly_cost}
                onChange={(e) => {
                  set("monthly_cost", Number(e.target.value))
                }}
              />
            </Field>
            <Field
              label="Maximum number of accounts"
              hint="0 means no limit. Above it, the allocator skips this server."
            >
              <Input
                type="number"
                min={0}
                value={form.max_accounts}
                onChange={(e) => {
                  set("max_accounts", Number(e.target.value))
                }}
              />
            </Field>
          </div>
          <Field
            label="Server status address"
            hint="Full URL to the status folder uploaded on the server."
          >
            <Input
              value={form.status_url}
              onChange={(e) => {
                set("status_url", e.target.value)
              }}
              placeholder="https://www.example.com/status/"
            />
          </Field>
          <Field label="Server group" hint="Plans allocate from a group, never a single server.">
            <Select
              value={form.group_id ?? "none"}
              onValueChange={(v) => {
                set("group_id", v === "none" ? null : v)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Ungrouped" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Ungrouped</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="mt-5 space-y-3 border-t border-border pt-4">
          <CheckboxRow
            checked={form.disabled}
            onChange={(v) => {
              set("disabled", v)
            }}
            label="Disable this provider"
            hint="Existing accounts keep working; no new accounts are placed here."
          />
          <CheckboxRow
            checked={form.status === "MAINTENANCE"}
            onChange={(v) => {
              set("status", v ? "MAINTENANCE" : "ACTIVE")
            }}
            label="Maintenance mode"
            hint="Same effect as disabling, but says why. FULL and UNREACHABLE are set by the system, not here."
          />
        </div>
      </Section>

      <Section
        title="Nameservers"
        description="What customers point their domains at. Shown on their hosting page verbatim."
        variant="panel"
      >
        <div className="space-y-3">
          {form.nameservers.slice(0, NAMESERVER_SLOTS).map((ns, i) => (
            // Index-keyed on purpose: these are five fixed positional slots, not
            // a reorderable list — slot 2 is always the secondary nameserver.
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className="grid gap-3 md:grid-cols-[2fr_1fr]">
              <Input
                value={ns.host}
                onChange={(e) => {
                  setNameserver(i, { host: e.target.value })
                }}
                placeholder={nameserverPlaceholder(i)}
              />
              <Input
                value={ns.ip}
                onChange={(e) => {
                  setNameserver(i, { ip: e.target.value })
                }}
                placeholder="IP address (optional)"
              />
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Provider details"
        description="The credentials this panel uses to provision accounts."
        variant="panel"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Module" required>
            <Select
              value={form.module_key}
              onValueChange={(v) => {
                set("module_key", v)
                const m = modules.find((mod) => mod.key === v)
                if (m?.default_port) set("port", m.default_port)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modules.map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Port">
            <Input
              type="number"
              value={form.port}
              onChange={(e) => {
                set("port", Number(e.target.value))
              }}
            />
          </Field>

          {/* Rendered from the module's descriptor rather than hard-coded, so a
              new control panel needs no change to this form. */}
          <Field label="Username" required hint={fieldHelp(activeModule?.fields, "username")}>
            <Input
              value={form.username}
              onChange={(e) => {
                set("username", e.target.value)
              }}
            />
          </Field>
          <Field
            label="API token"
            hint={
              isEdit && existing?.has_api_token
                ? "A token is stored. Leave blank to keep it."
                : fieldHelp(activeModule?.fields, "api_token")
            }
          >
            <Input
              type="password"
              autoComplete="new-password"
              value={apiToken ?? ""}
              onChange={(e) => {
                setApiToken(e.target.value)
              }}
              placeholder={existing?.has_api_token ? "••••••••••••••••" : ""}
            />
          </Field>
          <Field
            label="Password"
            hint={
              isEdit && existing?.has_password
                ? "A password is stored. Leave blank to keep it."
                : fieldHelp(activeModule?.fields, "password")
            }
          >
            <Input
              type="password"
              autoComplete="new-password"
              value={password ?? ""}
              onChange={(e) => {
                setPassword(e.target.value)
              }}
              placeholder={existing?.has_password ? "••••••••••••••••" : ""}
            />
          </Field>
          <div className="flex items-end">
            <CheckboxRow
              checked={form.secure ?? true}
              onChange={(v) => {
                set("secure", v)
              }}
              label="Secure"
              hint="Use SSL. Unchecking also skips certificate verification, and the fleet grid flags it."
            />
          </div>
        </div>
      </Section>

      <Section
        title="SSO access control"
        description="Which operators may open a control-panel session on this server. Customers reaching their own account are unaffected."
        variant="panel"
      >
        <div className="space-y-3">
          <RadioRow
            checked={form.sso_access === "unrestricted"}
            onSelect={() => {
              set("sso_access", "unrestricted")
            }}
            label="Unrestricted"
            hint="Any platform admin can connect."
          />
          <RadioRow
            checked={form.sso_access === "restricted"}
            onSelect={() => {
              set("sso_access", "restricted")
            }}
            label="Restricted"
            hint="Only the operator IDs listed below. An empty list allows nobody."
          />
          {form.sso_access === "restricted" && (
            <Textarea
              rows={3}
              value={(form.sso_allowed?.users ?? []).join("\n")}
              onChange={(e) => {
                set("sso_allowed", {
                  roles: form.sso_allowed?.roles ?? [],
                  users: e.target.value
                    .split("\n")
                    .map((v) => v.trim())
                    .filter(Boolean),
                })
              }}
              placeholder="One operator user id per line"
            />
          )}
        </div>
      </Section>
    </div>
  )
}

/** The primary button's label across its three states. */
function saveLabel(saving: boolean, isEdit: boolean): string {
  if (saving) return "Saving…"
  return isEdit ? "Save changes" : "Add provider"
}

/**
 * Placeholders for the five fixed nameserver slots. Only the first two are
 * conventionally required, so the rest say so rather than suggesting a value.
 */
function nameserverPlaceholder(index: number): string {
  if (index === 0) return "ns1.example.com"
  if (index === 1) return "ns2.example.com"
  return "Optional"
}

/** The Test Connection result, rendered inline — it is an answer, not an error. */
function ProbeBanner({ probe }: Readonly<{ probe: ProbeResult }>) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border p-4 ${
        probe.ok
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-destructive/30 bg-destructive/5"
      }`}
    >
      {probe.ok ? (
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
      )}
      <div className="space-y-1">
        <p className="text-sm font-semibold">
          {probe.ok ? "Connected" : "Could not provision through this server"}
        </p>
        <p className="text-[13px] text-muted-foreground">{probe.message}</p>
        {probe.ok && (
          <div className="flex gap-2 pt-1">
            {probe.version && <Badge variant="outline">WHM {probe.version}</Badge>}
            <Badge variant="outline">{probe.accounts} accounts on the box</Badge>
          </div>
        )}
      </div>
    </div>
  )
}

function fieldHelp(
  fields: { key: string; help?: string }[] | undefined,
  key: string,
): string | undefined {
  return fields?.find((f) => f.key === key)?.help
}

function Field({
  label,
  hint,
  required,
  children,
}: Readonly<{ label: string; hint?: string; required?: boolean; children: React.ReactNode }>) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[13px] font-medium">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  )
}

function CheckboxRow({
  checked,
  onChange,
  label,
  hint,
}: Readonly<{ checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }>) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => {
          onChange(Boolean(v))
        }}
        className="mt-0.5"
      />
      <span>
        <span className="block text-[13px] font-medium">{label}</span>
        {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
      </span>
    </label>
  )
}

function RadioRow({
  checked,
  onSelect,
  label,
  hint,
}: Readonly<{ checked: boolean; onSelect: () => void; label: string; hint?: string }>) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
        checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
      }`}
    >
      <span
        className={`mt-0.5 size-4 shrink-0 rounded-full border-2 ${
          checked ? "border-primary bg-primary" : "border-muted-foreground"
        }`}
      />
      <span>
        <span className="block text-[13px] font-medium">{label}</span>
        {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
      </span>
    </button>
  )
}
