import { useEffect, useMemo, useState } from "react"

import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@datadack/common-ui"
import { AlertTriangle, CheckCircle2, Plus, RotateCcw, Save, ShieldCheck, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { NetworkingProblem, PlatformDefaults, PlatformVNet } from "../../superadmin.types"

interface CommonNetworkFormProps {
  readonly value: PlatformDefaults
  readonly onValidate: (doc: PlatformDefaults) => Promise<{ valid: boolean; problems: NetworkingProblem[] }>
  readonly onSave: (doc: PlatformDefaults, reason: string) => Promise<unknown>
  readonly saving: boolean
}

/**
 * Editing the common cluster configuration.
 *
 * The document is replaced WHOLE by the API — its numbers are only correct
 * relative to each other — so the form edits a local copy and submits all of it.
 * That is not a compromise: it is what lets the server validate the thing an
 * operator actually looked at, rather than a merge of stored-and-submitted state
 * that nobody ever saw as a unit.
 *
 * VALIDATE IS SEPARATE FROM SAVE. The dry run costs nothing and changes nothing,
 * and the server checks this document against EVERY configured cluster — so it
 * catches "this MTU is wrong for ap-south-3b" before the change reaches
 * ap-south-3b. Without it an operator would have to save to find out, and saving
 * is what reaches every site at once.
 */
export function CommonNetworkForm({ value, onValidate, onSave, saving }: CommonNetworkFormProps) {
  const { t } = useTranslation()
  const [doc, setDoc] = useState<PlatformDefaults>(() => structuredClone(value))
  const [problems, setProblems] = useState<NetworkingProblem[] | null>(null)
  const [checking, setChecking] = useState(false)
  const [reason, setReason] = useState("")

  // Re-seed only when the STORED revision moves. Re-seeding on every refetch
  // would discard an operator's unsaved edits mid-sentence; not re-seeding at
  // all would let them overwrite somebody else's saved change.
  useEffect(() => {
    setDoc(structuredClone(value))
    setProblems(null)
  }, [value.revision]) // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = useMemo(() => JSON.stringify(doc) !== JSON.stringify(value), [doc, value])
  const byField = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of problems ?? []) map.set(p.field, p.detail)
    return map
  }, [problems])

  function set<K extends keyof PlatformDefaults>(key: K, v: PlatformDefaults[K]) {
    setDoc((d) => ({ ...d, [key]: v }))
    // Any edit invalidates the previous verdict. A green tick above changed
    // fields is the worst state this control can be in.
    setProblems(null)
  }

  const fabric = doc.fabric
  const evpn = doc.evpn
  const zone = doc.platform_zone

  async function check() {
    setChecking(true)
    try {
      setProblems((await onValidate(doc)).problems)
    } finally {
      setChecking(false)
    }
  }

  const invalid = problems !== null && problems.length > 0

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-primary/5 p-4">
        <p className="text-sm">{t("superAdmin.networking.commonNotice")}</p>
      </Card>

      <FormSection
        title={t("superAdmin.networking.sections.fabric")}
        hint={t("superAdmin.networking.sections.fabricHint")}
      >
        <Field label={t("superAdmin.networking.fabricName")} error={byField.get("fabric.name")}>
          <Input
            value={fabric.name}
            onChange={(e) => { set("fabric", { ...fabric, name: e.target.value }) }}
          />
        </Field>
        <Field label={t("superAdmin.networking.protocol")} error={byField.get("fabric.protocol")}>
          <Select
            value={fabric.protocol}
            onValueChange={(v) => { set("fabric", { ...fabric, protocol: v }) }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openfabric">OpenFabric</SelectItem>
              <SelectItem value="ospf">OSPF</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field
          label={t("superAdmin.networking.underlayInterface")}
          error={byField.get("fabric.underlay_interface")}
        >
          <Input
            value={fabric.underlay_interface}
            onChange={(e) => { set("fabric", { ...fabric, underlay_interface: e.target.value }) }}
          />
        </Field>
        <Field
          label={t("superAdmin.networking.underlayVlan")}
          hint={t("superAdmin.networking.untaggedHint")}
          error={byField.get("fabric.underlay_vlan")}
        >
          <Input
            type="number"
            value={fabric.underlay_vlan}
            onChange={(e) => {
              set("fabric", { ...fabric, underlay_vlan: Number(e.target.value) })
            }}
          />
        </Field>
        <Field
          label={t("superAdmin.networking.underlayCidr")}
          error={byField.get("fabric.underlay_cidr")}
        >
          <Input
            className="font-mono"
            value={fabric.underlay_cidr}
            onChange={(e) => { set("fabric", { ...fabric, underlay_cidr: e.target.value }) }}
          />
        </Field>
        <Field
          label={t("superAdmin.networking.loopbacks")}
          hint={t("superAdmin.networking.loopbackHint")}
          error={byField.get("fabric.loopback_cidr")}
        >
          <Input
            className="font-mono"
            value={fabric.loopback_cidr}
            onChange={(e) => { set("fabric", { ...fabric, loopback_cidr: e.target.value }) }}
          />
        </Field>
        <Field
          label={t("superAdmin.networking.underlayMtu")}
          error={byField.get("fabric.underlay_mtu")}
        >
          <Input
            type="number"
            value={fabric.underlay_mtu}
            onChange={(e) => {
              const underlay = Number(e.target.value)
              // Overlay follows underlay automatically. It is arithmetic, not a
              // preference — VXLAN costs exactly 50 bytes — and letting the two
              // drift apart black-holes only large packets, which is the hardest
              // failure in this system to attribute.
              set("fabric", { ...fabric, underlay_mtu: underlay, overlay_mtu: underlay - 50 })
            }}
          />
        </Field>
        <Field label={t("superAdmin.networking.overlayMtu")} hint={t("superAdmin.networking.mtuHint")}>
          <Input value={fabric.overlay_mtu} readOnly className="bg-muted font-mono" />
        </Field>
      </FormSection>

      <FormSection
        title={t("superAdmin.networking.sections.evpn")}
        hint={t("superAdmin.networking.sections.evpnHint")}
      >
        <Field label={t("superAdmin.networking.controller")} error={byField.get("evpn.controller")}>
          <Input
            value={evpn.controller}
            onChange={(e) => { set("evpn", { ...evpn, controller: e.target.value }) }}
          />
        </Field>
        <Field label="ASN" error={byField.get("evpn.asn")}>
          <Input
            type="number"
            value={evpn.asn}
            onChange={(e) => { set("evpn", { ...evpn, asn: Number(e.target.value) }) }}
          />
        </Field>
      </FormSection>

      <FormSection
        title={t("superAdmin.networking.sections.zone")}
        hint={t("superAdmin.networking.sections.zoneHint")}
      >
        <Field label={t("superAdmin.networking.zone")} error={byField.get("platform_zone.zone")}>
          <Input
            className="font-mono"
            value={zone.zone}
            onChange={(e) => { set("platform_zone", { ...zone, zone: e.target.value }) }}
          />
        </Field>
        <Field label="L3 VNI" error={byField.get("platform_zone.l3_vni")}>
          <Input
            type="number"
            value={zone.l3_vni}
            onChange={(e) => { set("platform_zone", { ...zone, l3_vni: Number(e.target.value) }) }}
          />
        </Field>
      </FormSection>

      <VNetEditor
        vnets={zone.vnets}
        byField={byField}
        onChange={(vnets) => { set("platform_zone", { ...zone, vnets }) }}
      />

      {invalid ? (
        <Card className="border-destructive/40 bg-destructive/5 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="size-4 text-destructive" />
              {t("superAdmin.networking.problemsFound", { count: problems.length })}
            </p>
            {/* Every bad field at once, not the first: fixing one and re-running
                to find a second is a slow way to learn there were three. Fields
                shown inline above are repeated here so nothing is only visible
                after a scroll. */}
          <ul className="space-y-1.5">
            {problems.map((p) => (
              <li key={p.field} className="text-sm">
                <span className="font-mono text-xs text-destructive">{p.field}</span>
                <p className="text-muted-foreground">{p.detail}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      {problems !== null && problems.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 className="size-4" />
          {t("superAdmin.networking.validAgainstAll")}
        </div>
      ) : null}

      <Card className="sticky bottom-4 flex flex-wrap items-center gap-2 p-3 shadow-lg">
        <Input
          value={reason}
          onChange={(e) => { setReason(e.target.value) }}
          placeholder={t("superAdmin.networking.reasonPlaceholder")}
          aria-label={t("superAdmin.networking.reasonPlaceholder")}
          className="min-w-48 flex-1"
        />
        <Button variant="outline" disabled={checking} onClick={() => { void check() }}>
          <ShieldCheck className={cn("size-4", checking && "animate-pulse")} />
          {t("superAdmin.networking.validate")}
        </Button>
        <Button
          disabled={!dirty || saving || invalid}
          onClick={() => {
            // The revision is bumped for the operator. The server refuses a
            // write whose revision did not move — that is what stops two admins
            // overwriting each other — but making a human increment an integer
            // only produces forgotten bumps and confusing conflicts.
            void (async () => {
              await onSave({ ...doc, revision: value.revision + 1 }, reason)
              setProblems(null)
              setReason("")
            })()
          }}
        >
          <Save className="size-4" />
          {t("superAdmin.networking.save")}
        </Button>
        {dirty ? (
          <Button
            variant="ghost"
            onClick={() => {
              setDoc(structuredClone(value))
              setProblems(null)
            }}
          >
            <RotateCcw className="size-4" />
            {t("superAdmin.networking.discard")}
          </Button>
        ) : null}
        <Badge variant="secondary">
          {t("superAdmin.networking.revisionWillBe", { next: value.revision + 1 })}
        </Badge>
      </Card>
    </div>
  )
}

/** The VNets, edited in place. Each is an L2 segment with its own firewall chain. */
function VNetEditor({
  vnets,
  byField,
  onChange,
}: Readonly<{
  vnets: PlatformVNet[]
  byField: Map<string, string>
  onChange: (v: PlatformVNet[]) => void
}>) {
  const { t } = useTranslation()

  const update = (i: number, patch: Partial<PlatformVNet>) => {
    const next = [...vnets]
    next[i] = { ...next[i], ...patch }
    onChange(next)
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="font-medium">{t("superAdmin.networking.vnets")}</h3>
          <p className="text-sm text-muted-foreground">{t("superAdmin.networking.vnetsHint")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onChange([
              ...vnets,
              { vnet: "", name: "", l2_vni: 0, cidr: "", gateway: "", snat: false, dhcp: false },
            ])
          }}
        >
          <Plus className="size-4" />
          {t("superAdmin.networking.addVnet")}
        </Button>
      </div>

      <div className="divide-y">
        {vnets.map((v, i) => {
          const err = byField.get(`platform_zone.vnets[${i}].cidr`) ??
            byField.get(`platform_zone.vnets[${i}].gateway`) ??
            byField.get(`platform_zone.vnets[${i}].vnet`) ??
            byField.get(`platform_zone.vnets[${i}].l2_vni`)
          return (
            <div key={i} className={cn("p-4", err && "bg-destructive/5")}>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Field label={t("superAdmin.networking.vnetName")}>
                  <Input value={v.name} onChange={(e) => { update(i, { name: e.target.value }) }} />
                </Field>
                <Field label={t("superAdmin.networking.vnetId")}>
                  <Input
                    className="font-mono"
                    value={v.vnet}
                    onChange={(e) => { update(i, { vnet: e.target.value }) }}
                  />
                </Field>
                <Field label="L2 VNI">
                  <Input
                    type="number"
                    value={v.l2_vni}
                    onChange={(e) => { update(i, { l2_vni: Number(e.target.value) }) }}
                  />
                </Field>
                <Field label={t("superAdmin.networking.cidr")}>
                  <Input
                    className="font-mono"
                    value={v.cidr}
                    onChange={(e) => {
                      // The gateway follows the CIDR unless it has been set to
                      // something else: .1 is the anycast gateway convention
                      // everywhere in this platform, and retyping it for every
                      // VNet is how one of them ends up outside its own subnet.
                      const gw = deriveGateway(e.target.value)
                      const follow = v.gateway === "" || v.gateway === deriveGateway(v.cidr)
                      update(i, { cidr: e.target.value, ...(follow && gw ? { gateway: gw } : {}) })
                    }}
                  />
                </Field>
                <Field label={t("superAdmin.networking.gateway")}>
                  <div className="flex gap-2">
                    <Input
                      className="font-mono"
                      value={v.gateway}
                      onChange={(e) => { update(i, { gateway: e.target.value }) }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("superAdmin.networking.removeVnet")}
                      onClick={() => { onChange(vnets.filter((_, j) => j !== i)) }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </Field>
              </div>
              {err ? <p className="mt-2 text-sm text-destructive">{err}</p> : null}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/** .1 of the network, which is the anycast gateway convention throughout. */
function deriveGateway(cidr: string): string {
  const parts = cidr.split("/")[0].split(".")
  if (parts.length !== 4) return ""
  return `${parts[0]}.${parts[1]}.${parts[2]}.1`
}

function FormSection({
  title,
  hint,
  children,
}: Readonly<{ title: string; hint?: string; children: React.ReactNode }>) {
  return (
    <Card className="p-4">
      <div className="mb-4">
        <h3 className="font-medium">{title}</h3>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </Card>
  )
}

/** An error replaces the hint rather than stacking under it: two lines of
 *  guidance where one of them says the value is wrong is noise. */
function FieldNote({ error, hint }: Readonly<{ error?: string; hint?: string }>) {
  if (error) return <p className="text-xs text-destructive">{error}</p>
  if (hint) return <p className="text-xs text-muted-foreground">{hint}</p>
  return null
}

function Field({
  label,
  hint,
  error,
  children,
}: Readonly<{ label: string; hint?: string; error?: string; children: React.ReactNode }>) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
      <FieldNote error={error} hint={hint} />
    </div>
  )
}
