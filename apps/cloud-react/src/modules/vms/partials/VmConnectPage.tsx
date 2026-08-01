import { useState } from "react"

import { Label } from "@datadack/common-ui"
import { Skeleton } from "@datadack/common-ui"
import { Info, MonitorDot, Terminal as TerminalIcon, KeyRound } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

import { CopyButton, PageHeader, Section } from "@/components/console"
import { Button, Input } from "@datadack/common-ui"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useSSHKeys } from "@/modules/ssh-keys/ssh-keys.hooks"
import { useScreen } from "@/services/api/screen"

import { VMS_ROUTES } from "../vms.constants"
import { useInstance } from "../vms.hooks"
import type { Instance } from "../vms.types"

/** Best-guess default login account from the resolved OS label — mirrors the
 *  backend, which uses the image's cloud-init user (the image name). */
function guessUsername(os: string | undefined): string {
  const label = (os ?? "").toLowerCase()
  for (const distro of ["ubuntu", "debian", "rocky", "centos", "fedora", "alma"]) {
    if (label.includes(distro)) return distro
  }
  return "root"
}

/**
 * AWS-style "Connect to instance" page: a tabbed chooser between the browser
 * SSH login (Instance Connect), manual SSH-client instructions, and the
 * Proxmox serial console. The actual terminal always opens in its own tab.
 */
export function VmConnectPage() {
  useScreen("vms.vm-connect")
  const { t } = useTranslation()
  const { id = "" } = useParams()
  const { data: instance, isLoading } = useInstance(id)

  if (isLoading || !instance) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={t("vms.connect.title", "Connect to instance")}
        description={t(
          "vms.connect.description",
          "Connect to your instance using the browser-based client, your own SSH client, or the serial console.",
        )}
        breadcrumbs={[
          { label: t("vms.title", "Instances"), to: VMS_ROUTES.ROOT },
          { label: instance.name, to: VMS_ROUTES.detail(instance.id) },
          { label: t("vms.connect.crumb", "Connect") },
        ]}
        className="mb-4"
      />

      <Section variant="panel" className="mb-4 p-4">
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryItem label={t("vms.connect.instanceId", "Instance ID")}>
            <CopyButton
              value={`VM-${instance.tenant_serial}`}
              label={`VM-${instance.tenant_serial} (${instance.name})`}
            />
          </SummaryItem>
          <SummaryItem label={t("vms.connect.vpcId", "VPC ID")}>
            {instance.vpc_id ? (
              <CopyButton value={instance.vpc_id} label={`${instance.vpc_id.slice(0, 8)}…`} />
            ) : (
              "—"
            )}
          </SummaryItem>
          <SummaryItem label={t("vms.connect.publicIp", "Public IP")}>
            {instance.public_ip ? <CopyButton value={instance.public_ip} /> : "—"}
          </SummaryItem>
          <SummaryItem label={t("vms.connect.privateIp", "Private IP")}>
            {instance.private_ip ? <CopyButton value={instance.private_ip} /> : "—"}
          </SummaryItem>
        </div>
      </Section>

      <Tabs defaultValue="instance-connect" className="gap-0">
        <TabsList variant="line" className="mb-0">
          <TabsTrigger value="instance-connect" className="gap-1.5">
            <TerminalIcon className="size-3.5" />
            {t("vms.connect.tabs.instanceConnect", "Instance Connect")}
          </TabsTrigger>
          <TabsTrigger value="ssh-client" className="gap-1.5">
            <KeyRound className="size-3.5" />
            {t("vms.connect.tabs.sshClient", "SSH client")}
          </TabsTrigger>
          <TabsTrigger value="serial-console" className="gap-1.5">
            <MonitorDot className="size-3.5" />
            {t("vms.connect.tabs.serialConsole", "Serial console")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instance-connect" className="mt-3">
          <InstanceConnectTab instance={instance} />
        </TabsContent>
        <TabsContent value="ssh-client" className="mt-3">
          <SshClientTab instance={instance} />
        </TabsContent>
        <TabsContent value="serial-console" className="mt-3">
          <SerialConsoleTab instance={instance} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SummaryItem({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="min-w-0 space-y-0.5">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="truncate text-sm">{children}</div>
    </div>
  )
}

/* ── Shared bits ───────────────────────────────────────────────────────── */

function NoteBox({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-status-info/40 bg-status-info/5 px-3 py-2.5 text-[13px] text-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0 text-status-info" />
      <span>{children}</span>
    </div>
  )
}

function ConnectFooter({
  onConnect,
  disabled,
  disabledReason,
}: Readonly<{ onConnect?: () => void; disabled?: boolean; disabledReason?: string }>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = "" } = useParams()
  return (
    <div className="mt-5 flex items-center justify-end gap-3 border-t border-border/60 pt-4">
      {disabled && disabledReason && (
        <span className="mr-auto text-[13px] text-muted-foreground">{disabledReason}</span>
      )}
      <Button variant="ghost" size="sm" onClick={() => void navigate(VMS_ROUTES.detail(id))}>
        {t("common.cancel", "Cancel")}
      </Button>
      {onConnect && (
        <Button size="sm" disabled={disabled} onClick={onConnect}>
          {t("vms.actions.connect", "Connect")}
        </Button>
      )}
    </div>
  )
}

/* ── Instance Connect (browser SSH) ────────────────────────────────────── */

function InstanceConnectTab({ instance }: Readonly<{ instance: Instance }>) {
  const { t } = useTranslation()
  const [username, setUsername] = useState(() => guessUsername(instance.os))
  const [ipKind, setIpKind] = useState<"public" | "private">(
    instance.public_ip ? "public" : "private",
  )
  const notRunning = instance.status !== "running"
  const selectedIp = ipKind === "public" ? instance.public_ip : instance.private_ip

  return (
    <Section variant="panel" className="p-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t("vms.connect.connectionType", "Connection type")}</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <ChoiceCard
              selected={ipKind === "public"}
              disabled={!instance.public_ip}
              title={t("vms.connect.publicIpOption", "Connect using a Public IP")}
              description={t(
                "vms.connect.publicIpOptionDesc",
                "Connect using the instance's public IPv4 address",
              )}
              onSelect={() => {
                setIpKind("public")
              }}
            />
            <ChoiceCard
              selected={ipKind === "private"}
              disabled={!instance.private_ip}
              title={t("vms.connect.privateIpOption", "Connect using a Private IP")}
              description={t(
                "vms.connect.privateIpOptionDesc",
                "Connect using the private IP address within the VPC",
              )}
              onSelect={() => {
                setIpKind("private")
              }}
            />
          </div>
        </div>

        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Field
            label={
              ipKind === "public"
                ? t("vms.connect.publicIpv4", "Public IPv4 address")
                : t("vms.connect.privateIpv4", "Private IPv4 address")
            }
          >
            {selectedIp ? <CopyButton value={selectedIp} /> : "—"}
          </Field>

          <div className="space-y-1.5">
            <Label htmlFor="connect-username">{t("vms.connect.username", "Username")}</Label>
            <Input
              id="connect-username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
              }}
              placeholder={guessUsername(instance.os)}
              className="h-8 font-mono"
            />
            <p className="text-xs text-muted-foreground">
              {t(
                "vms.connect.usernameHelp",
                "The username defined in the image used to launch the instance.",
              )}
            </p>
          </div>
        </div>

        <NoteBox>
          {t("vms.connect.usernameNote", {
            defaultValue:
              "Note: In most cases, the default username, {{user}}, is correct. However, read your image usage instructions to check if the image owner has changed the default username.",
            user: guessUsername(instance.os),
          })}
        </NoteBox>
      </div>

      <ConnectFooter
        disabled={notRunning}
        disabledReason={
          notRunning
            ? t("vms.connect.notRunning", "The instance must be running to connect.")
            : undefined
        }
        onConnect={() => {
          window.open(
            VMS_ROUTES.console(instance.id, "ssh", username.trim() || undefined),
            "_blank",
            "noopener,noreferrer",
          )
        }}
      />
    </Section>
  )
}

/* ── SSH client (manual instructions) ──────────────────────────────────── */

function SshClientTab({ instance }: Readonly<{ instance: Instance }>) {
  const { t } = useTranslation()
  const { data: sshKeys = [] } = useSSHKeys()
  const sshKey = sshKeys.find((k) => k.id === instance.ssh_key_id)
  const keyFile = `${sshKey?.name ?? "your-key"}.pem`
  const host = instance.public_ip || instance.private_ip
  const user = guessUsername(instance.os)

  return (
    <Section variant="panel" className="p-4">
      <div className="space-y-4">
        <ol className="list-decimal space-y-2.5 pl-5 text-sm text-foreground">
          <li>{t("vms.connect.ssh.step1", "Open an SSH client.")}</li>
          <li>
            {t("vms.connect.ssh.step2", {
              defaultValue:
                "Locate your private key file. The key used to launch this instance is {{key}}",
              key: keyFile,
            })}
          </li>
          <li>
            <div className="space-y-1">
              {t(
                "vms.connect.ssh.step3",
                "Run this command, if necessary, to ensure your key is not publicly viewable.",
              )}
              <div>
                <CopyButton value={`chmod 400 "${keyFile}"`} />
              </div>
            </div>
          </li>
          <li>
            <div className="space-y-1">
              {t("vms.connect.ssh.step4", {
                defaultValue: "Connect to your instance using its {{kind}} IP address:",
                kind: instance.public_ip
                  ? t("vms.connect.ssh.public", "public")
                  : t("vms.connect.ssh.private", "private"),
              })}
              <div>{host ? <CopyButton value={host} /> : "—"}</div>
            </div>
          </li>
        </ol>

        <div className="space-y-1.5">
          <Label>{t("vms.connect.ssh.example", "Example:")}</Label>
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
            <CopyButton value={`ssh -i "${keyFile}" ${user}@${host || "<instance-ip>"}`} />
          </div>
        </div>

        <NoteBox>
          {t(
            "vms.connect.ssh.note",
            "Note: In most cases, the guessed username is correct. However, read your image usage instructions to check if the image owner has changed the default username.",
          )}
        </NoteBox>
      </div>

      <ConnectFooter />
    </Section>
  )
}

/* ── Serial console ────────────────────────────────────────────────────── */

function SerialConsoleTab({ instance }: Readonly<{ instance: Instance }>) {
  const { t } = useTranslation()
  const notRunning = instance.status !== "running"

  return (
    <Section variant="panel" className="p-4">
      <div className="space-y-4">
        <Field label={t("vms.connect.serialPort", "Serial port")}>
          <CopyButton value="ttyS0" />
        </Field>

        <NoteBox>
          {t(
            "vms.connect.serialNote",
            "The serial console attaches to the instance's own console (ttyS0) and shows a login prompt — useful when the instance is unreachable over the network. You need valid guest OS credentials to log in.",
          )}
        </NoteBox>
      </div>

      <ConnectFooter
        disabled={notRunning}
        disabledReason={
          notRunning
            ? t("vms.connect.notRunning", "The instance must be running to connect.")
            : undefined
        }
        onConnect={() => {
          window.open(VMS_ROUTES.console(instance.id, "guest"), "_blank", "noopener,noreferrer")
        }}
      />
    </Section>
  )
}

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="space-y-1">
      <div className="text-[13px] font-medium text-muted-foreground">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  )
}

function ChoiceCard({
  selected,
  disabled,
  title,
  description,
  onSelect,
}: Readonly<{
  selected: boolean
  disabled?: boolean
  title: string
  description: string
  onSelect: () => void
}>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-left transition-colors",
        selected ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40",
        disabled && "cursor-not-allowed opacity-50 hover:border-border",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-primary" : "border-muted-foreground/50",
        )}
      >
        {selected && <span className="size-2 rounded-full bg-primary" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="block text-[13px] text-muted-foreground">{description}</span>
      </span>
    </button>
  )
}
