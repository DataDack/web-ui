import { useMemo, useState } from "react"

import { Button, cn, Input, Label, Textarea } from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangle, Download, KeyRound, Loader2, Sparkles, Upload } from "lucide-react"
import { motion } from "motion/react"
import { useForm, type UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { z } from "zod/v4"

import { CreateWizard, PageHeader, type WizardStep } from "@/components/console"
import { canGenerateKeyPair, generateEd25519KeyPair } from "@/lib/ssh-keygen"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"
import { useScreen } from "@/services/api/screen"

import { SSH_KEYS_ROUTES } from "../ssh-keys.constants"
import { useCreateSSHKey } from "../ssh-keys.hooks"

const PUBLIC_KEY_PATTERN = /^(ssh-(rsa|ed25519|dss)|ecdsa-sha2-nistp(256|384|521))\s+\S+/

const makeSchema = (rule: NamingRule) =>
  z.object({
    method: z.enum(["generate", "import"]),
    name: namingNameSchema(rule),
    public_key: z
      .string()
      .min(1, "Required")
      .regex(
        PUBLIC_KEY_PATTERN,
        "Must be a valid OpenSSH public key (e.g. starts with ssh-ed25519)",
      ),
  })

type FormValues = z.infer<ReturnType<typeof makeSchema>>

export function SshKeyCreateWizardPage() {
  useScreen("ssh-keys.ssh-key-create-wizard")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { mutate: create, isPending } = useCreateSSHKey()
  const { rule } = useNamingRule("ssh-key")
  const schema = useMemo(() => makeSchema(rule), [rule])

  // The generated private key lives only in component state — it is streamed
  // straight to a file download and never rendered or submitted. The backend
  // only ever receives `public_key`; state is kept solely for "Download again".
  const [privateKey, setPrivateKey] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { method: "generate", name: "", public_key: "" },
    mode: "onTouched",
  })

  const resetKeyMaterial = () => {
    form.setValue("public_key", "")
    setPrivateKey(null)
  }

  const setMethod = (method: FormValues["method"]) => {
    if (form.getValues("method") === method) return
    form.setValue("method", method, { shouldValidate: true })
    resetKeyMaterial()
  }

  const triggerDownload = (key: string) => {
    const rawName = form.getValues("name").trim() || "id_ed25519"
    const base = rawName.replace(/\s+/g, "_").replace(/\.(txt|pem)$/i, "")
    const blob = new Blob([key], { type: "application/octet-stream" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${base}.pem`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const generate = async () => {
    setGenerating(true)
    try {
      const pair = await generateEd25519KeyPair(form.getValues("name"))
      form.setValue("public_key", pair.publicKey, { shouldValidate: true })
      setPrivateKey(pair.privateKey)
      // Auto-download immediately — still inside the generate click's user
      // gesture, so the browser won't block it.
      triggerDownload(pair.privateKey)
    } catch {
      toast.error(t("sshKeys.wizard.generateFailed"))
    } finally {
      setGenerating(false)
    }
  }

  const downloadPrivateKey = () => {
    if (privateKey) triggerDownload(privateKey)
  }

  const steps: WizardStep<FormValues>[] = [
    {
      id: "method",
      title: t("sshKeys.wizard.method"),
      description: t("sshKeys.wizard.methodDescription"),
      fields: ["method"],
      render: (f) => <MethodStep form={f} onSelect={setMethod} />,
      reviewItems: (values) => [
        {
          label: t("sshKeys.wizard.method"),
          value:
            values.method === "generate"
              ? t("sshKeys.wizard.generateOption")
              : t("sshKeys.wizard.importOption"),
        },
      ],
    },
    {
      id: "key",
      title: t("sshKeys.wizard.keyStep"),
      description: t("sshKeys.wizard.keyStepDescription"),
      fields: ["public_key"],
      render: (f) => (
        <KeyStep
          form={f}
          generating={generating}
          onGenerate={() => void generate()}
          onDownload={downloadPrivateKey}
        />
      ),
      reviewItems: (values) => [
        {
          label: t("sshKeys.columns.type"),
          value: values.public_key.split(" ")[0] || "—",
          mono: true,
        },
      ],
    },
    {
      id: "name",
      title: t("sshKeys.form.name"),
      description: t("sshKeys.wizard.nameDescription"),
      fields: ["name"],
      render: (f) => <NameStep form={f} />,
      reviewItems: (values) => [{ label: t("sshKeys.form.name"), value: values.name, mono: true }],
    },
  ]

  return (
    <div>
      <PageHeader
        icon={KeyRound}
        breadcrumbs={[
          { label: t("console.nav.groups.compute") },
          { label: t("sshKeys.title"), to: SSH_KEYS_ROUTES.ROOT },
          { label: t("sshKeys.wizard.create") },
        ]}
        title={t("sshKeys.wizard.create")}
        description={t("sshKeys.wizard.subtitle")}
      />

      <CreateWizard<FormValues>
        steps={steps}
        form={form}
        submitLabel={t("sshKeys.form.add")}
        isSubmitting={isPending}
        onCancel={() => void navigate(SSH_KEYS_ROUTES.ROOT)}
        onSubmit={(values) => {
          create(
            { name: values.name, public_key: values.public_key },
            { onSuccess: () => void navigate(SSH_KEYS_ROUTES.ROOT) },
          )
        }}
      />
    </div>
  )
}

/* ── Shared field primitives ───────────────────────────────────────────── */

function FieldError({ message }: Readonly<{ message?: string }>) {
  if (!message) return null
  return <p className="text-[11px] text-destructive">{message}</p>
}

function FieldLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
      {children}
    </Label>
  )
}

/* ── Steps ─────────────────────────────────────────────────────────────── */

interface MethodStepProps {
  form: UseFormReturn<FormValues>
  onSelect: (method: FormValues["method"]) => void
}

function MethodStep({ form, onSelect }: Readonly<MethodStepProps>) {
  const { t } = useTranslation()
  const method = form.watch("method")
  const canGenerate = canGenerateKeyPair()

  const options = [
    {
      value: "generate" as const,
      icon: Sparkles,
      title: t("sshKeys.wizard.generateOption"),
      description: t("sshKeys.wizard.generateOptionDescription"),
      disabled: !canGenerate,
    },
    {
      value: "import" as const,
      icon: Upload,
      title: t("sshKeys.wizard.importOption"),
      description: t("sshKeys.wizard.importOptionDescription"),
      disabled: false,
    },
  ]

  return (
    <div className="grid sm:grid-cols-2 gap-2.5">
      {options.map((option) => {
        const active = method === option.value
        const Icon = option.icon
        return (
          <motion.button
            key={option.value}
            type="button"
            whileTap={option.disabled ? undefined : { scale: 0.98 }}
            disabled={option.disabled}
            onClick={() => {
              onSelect(option.value)
            }}
            className={cn(
              "glass-1 relative px-4 py-4 text-left transition-colors",
              active ? "gradient-ring" : "hover:bg-accent/30 border-border-glass",
              option.disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            <Icon className="size-4 text-muted-foreground" />
            <span className="mt-2 block text-[13px] font-medium text-foreground">
              {option.title}
            </span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              {option.disabled ? t("sshKeys.wizard.generateUnsupported") : option.description}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}

interface KeyStepProps {
  form: UseFormReturn<FormValues>
  generating: boolean
  onGenerate: () => void
  onDownload: () => void
}

function KeyStep({ form, generating, onGenerate, onDownload }: Readonly<KeyStepProps>) {
  const { t } = useTranslation()
  const method = form.watch("method")
  const publicKey = form.watch("public_key")

  if (method === "import") {
    return (
      <div className="space-y-1.5">
        <FieldLabel>{t("sshKeys.form.publicKey")} *</FieldLabel>
        <Textarea
          {...form.register("public_key")}
          placeholder="ssh-ed25519 AAAA..."
          rows={6}
          className="font-mono text-[12px] resize-none"
        />
        <FieldError message={form.formState.errors.public_key?.message} />
        <p className="text-[11px] text-muted-foreground">{t("sshKeys.form.publicKeyHint")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {!publicKey ? (
        <Button type="button" onClick={onGenerate} disabled={generating} className="gap-2">
          {generating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {generating ? t("sshKeys.wizard.generating") : t("sshKeys.wizard.generateKeypair")}
        </Button>
      ) : (
        <div className="space-y-1.5">
          <FieldLabel>{t("sshKeys.wizard.privateKey")}</FieldLabel>
          <div className="flex items-start gap-2 rounded-md border border-status-warning/40 bg-status-warning/10 px-3 py-2.5">
            <AlertTriangle className="size-4 shrink-0 text-status-warning mt-0.5" />
            <p className="text-[12px] text-foreground/90">
              {t("sshKeys.wizard.privateKeyWarning")}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button type="button" onClick={onDownload} className="gap-2">
              <Download className="size-3.5" />
              {t("sshKeys.wizard.downloadPrivateKey")}
            </Button>
            <Button type="button" variant="ghost" onClick={onGenerate}>
              {t("sshKeys.wizard.regenerate")}
            </Button>
          </div>
        </div>
      )}
      <FieldError message={form.formState.errors.public_key?.message} />
    </div>
  )
}

function NameStep({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
  const { t } = useTranslation()
  return (
    <div className="space-y-1.5 max-w-sm">
      <FieldLabel>{t("sshKeys.form.name")} *</FieldLabel>
      <Input {...form.register("name")} placeholder="my-laptop" className="font-mono" />
      <FieldError message={form.formState.errors.name?.message} />
    </div>
  )
}
