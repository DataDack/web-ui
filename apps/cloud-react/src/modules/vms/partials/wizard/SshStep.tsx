import { useState, useMemo, useRef } from "react"

import { KeyRound, Sparkles, Upload, Loader2, Plus } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { canGenerateKeyPair, generateEd25519KeyPair } from "@/lib/ssh-keygen"
import { cn } from "@/lib/utils"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import { namingNameSchema } from "@/modules/governance/governance.validation"
import { useSSHKeys, useCreateSSHKey } from "@/modules/ssh-keys/ssh-keys.hooks"
import type { SSHKey } from "@/modules/ssh-keys/ssh-keys.types"

import { FieldLabel, FieldError } from "./wizard.shared"
import { PUBLIC_KEY_PATTERN, type FormValues } from "./wizard.types"

export function SshStep({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
  const { t } = useTranslation()
  const { data: sshKeys = [], isLoading } = useSSHKeys()
  const [sheetOpen, setSheetOpen] = useState(false)

  const selectedId = form.watch("ssh_key_id")

  let placeholder = t("vms.wizard.noKeySelected")
  if (isLoading) placeholder = t("common.loading")
  else if (sshKeys.length === 0) placeholder = t("vms.wizard.noKeysYet")

  return (
    <div className="space-y-3">
      <FieldLabel>
        {t("vms.detail.sshKey")}{" "}
        <span className="font-normal normal-case text-muted-foreground">
          {t("common.optional", "(optional)")}
        </span>
      </FieldLabel>

      <Select
        value={selectedId}
        disabled={isLoading || sshKeys.length === 0}
        onValueChange={(id) => {
          form.setValue("ssh_key_id", id, { shouldValidate: true })
        }}
      >
        <SelectTrigger
          className={cn("w-full", form.formState.errors.ssh_key_id && "border-destructive")}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {sshKeys.map((key) => (
            <SelectItem key={key.id} value={key.id}>
              <span className="flex min-w-0 items-center gap-2">
                <KeyRound className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="text-[13px] font-medium">{key.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <FieldError message={form.formState.errors.ssh_key_id?.message} />

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => {
          setSheetOpen(true)
        }}
      >
        <Plus className="size-3.5" />
        {t("vms.wizard.addNewSshKey")}
      </Button>

      <SshKeySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSelect={(id) => {
          form.setValue("ssh_key_id", id, { shouldValidate: true })
          setSheetOpen(false)
        }}
      />
    </div>
  )
}

/* ── Sheet: generate / import a new key ────────────────────────────────────── */

interface SshKeySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (id: string) => void
}

type SshKeyMode = "generate" | "import"

function SshKeySheet({ open, onOpenChange, onSelect }: Readonly<SshKeySheetProps>) {
  const { t } = useTranslation()
  const canGenerate = canGenerateKeyPair()

  // Existing keys are now picked inline via the selector, so this sheet only
  // creates a new key: generate in-browser when supported, otherwise import.
  const [mode, setMode] = useState<SshKeyMode>(canGenerate ? "generate" : "import")

  const options: {
    value: SshKeyMode
    label: string
    icon: typeof KeyRound
    disabled?: boolean
  }[] = [
    {
      value: "generate",
      label: t("sshKeys.wizard.generateOption"),
      icon: Sparkles,
      disabled: !canGenerate,
    },
    { value: "import", label: t("sshKeys.wizard.importOption"), icon: Upload },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-130 flex-col gap-0 p-0">
        <SheetHeader className="shrink-0 px-6 py-5">
          <SheetTitle>{t("vms.wizard.addNewSshKey")}</SheetTitle>
          <SheetDescription>{t("vms.wizard.addSshKeySheetSubtitle")}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="px-6">
            <Select
              value={mode}
              onValueChange={(v) => {
                setMode(v as SshKeyMode)
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map(({ value, label, icon: Icon, disabled }) => (
                  <SelectItem key={value} value={value} disabled={disabled}>
                    <span className="flex items-center gap-2">
                      <Icon className="size-3.5" />
                      {label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {mode === "generate" && (
              <SshKeyCreate
                method="generate"
                onCreated={(k) => {
                  onSelect(k.id)
                }}
              />
            )}
            {mode === "import" && (
              <SshKeyCreate
                method="import"
                onCreated={(k) => {
                  onSelect(k.id)
                }}
              />
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ── Create panel (generate-in-browser or import) ─────────────────────────── */

interface SshKeyCreateProps {
  method: "generate" | "import"
  onCreated: (key: SSHKey) => void
}

// The generated private key never touches state or the DOM — it is streamed
// straight to a file download the moment it is generated, then the key is
// saved and selected in the same click; the backend only receives `public_key`.
function SshKeyCreate({ method, onCreated }: Readonly<SshKeyCreateProps>) {
  const { t } = useTranslation()
  const { data: existingKeys = [] } = useSSHKeys()
  const { mutateAsync: create, isPending } = useCreateSSHKey()
  const { rule } = useNamingRule("ssh-key")
  const nameSchema = useMemo(() => namingNameSchema(rule), [rule])

  const [name, setName] = useState("")
  const [publicKey, setPublicKey] = useState("")
  const [generating, setGenerating] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [keyError, setKeyError] = useState<string | null>(null)

  // A random name that satisfies the org naming convention and doesn't collide
  // with an existing key. The convention is an arbitrary org-configured regex,
  // so candidates are probed against it from most to least conventional; null
  // when the convention admits none of them (the user must then type a name).
  const autogenName = (): string | null => {
    const taken = new Set(existingKeys.map((k) => k.name))
    const pick = (chars: string, n: number) =>
      Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => chars[b % chars.length]).join("")
    for (let attempt = 0; attempt < 10; attempt++) {
      const suffix = pick("abcdefghijklmnopqrstuvwxyz0123456789", 5)
      const letters = pick("abcdefghijklmnopqrstuvwxyz", 5)
      const candidates = [
        `key-${suffix}`,
        `key${suffix}`,
        `key${letters}`,
        `KEY${letters.toUpperCase()}`,
      ]
      for (const candidate of candidates) {
        if (!taken.has(candidate) && nameSchema.safeParse(candidate).success) {
          return candidate
        }
      }
    }
    return null
  }

  const validateName = (): string | null => {
    const trimmed = name.trim()
    if (!trimmed) {
      const generated = autogenName()
      if (generated) {
        // Show the generated name so the user knows what the key (and the
        // downloaded .pem) is called, and so a retry reuses the same name.
        setName(generated)
        setNameError(null)
        return generated
      }
      setNameError("Required")
      return null
    }
    const result = nameSchema.safeParse(trimmed)
    if (!result.success) {
      setNameError(result.error.issues[0]?.message ?? "Required")
      return null
    }
    setNameError(null)
    return result.data
  }

  const triggerDownload = (key: string, baseName: string) => {
    const base = (baseName || "id_ed25519").replace(/\s+/g, "_").replace(/\.(txt|pem)$/i, "")
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

  // A pair that was generated and downloaded but whose save failed. Retained so
  // retrying re-attempts the save instead of minting (and downloading) a new
  // key that would orphan the .pem already on the user's disk. Keyed by name:
  // the name is embedded in the key comment, so a rename invalidates it.
  const pendingPair = useRef<{ name: string; publicKey: string } | null>(null)

  // One click does it all: generate the pair, download the private key (still
  // inside the click's user gesture so the browser won't block it), then save
  // and select the new key.
  const generateAndSave = async () => {
    const validName = validateName()
    if (!validName) return
    setGenerating(true)
    try {
      let pending = pendingPair.current
      if (pending?.name !== validName) {
        let pair
        try {
          pair = await generateEd25519KeyPair(validName)
        } catch {
          toast.error(t("sshKeys.wizard.generateFailed"))
          return
        }
        triggerDownload(pair.privateKey, validName)
        pending = { name: validName, publicKey: pair.publicKey }
        pendingPair.current = pending
      }
      const key = await create({ name: pending.name, public_key: pending.publicKey })
      onCreated(key)
    } catch {
      // useCreateSSHKey surfaces its own error toast.
    } finally {
      setGenerating(false)
    }
  }

  const submit = async () => {
    const validName = validateName()
    if (!validName) return
    const trimmedKey = publicKey.trim()
    if (!PUBLIC_KEY_PATTERN.test(trimmedKey)) {
      setKeyError(t("sshKeys.wizard.keyInvalid"))
      return
    }
    setKeyError(null)
    try {
      const key = await create({ name: validName, public_key: trimmedKey })
      onCreated(key)
    } catch {
      // useCreateSSHKey surfaces its own error toast.
    }
  }

  const busy = generating || isPending

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <FieldLabel>
          {t("sshKeys.form.name")}{" "}
          <span className="font-normal normal-case text-muted-foreground">
            {t("common.optional", "(optional)")}
          </span>
        </FieldLabel>
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (nameError) setNameError(null)
          }}
          placeholder="my-laptop"
          className="font-mono"
        />
        <FieldError message={nameError ?? undefined} />
      </div>

      {method === "import" ? (
        <>
          <div className="space-y-1.5">
            <FieldLabel>{t("sshKeys.form.publicKey")} *</FieldLabel>
            <Textarea
              value={publicKey}
              onChange={(e) => {
                setPublicKey(e.target.value)
                if (keyError) setKeyError(null)
              }}
              placeholder="ssh-ed25519 AAAA..."
              rows={5}
              className="resize-none font-mono text-[12px]"
            />
            <FieldError message={keyError ?? undefined} />
            <p className="text-[11px] text-muted-foreground">{t("sshKeys.form.publicKeyHint")}</p>
          </div>

          <div className="flex items-center gap-2 border-t border-border-glass pt-4">
            <Button
              type="button"
              variant="gold"
              className="gap-2"
              disabled={isPending || !publicKey}
              onClick={() => void submit()}
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              Save & select
            </Button>
          </div>
        </>
      ) : (
        <Button
          type="button"
          variant="gold"
          onClick={() => void generateAndSave()}
          disabled={busy}
          className="gap-2"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          {busy ? t("sshKeys.wizard.generating") : t("sshKeys.wizard.generateKeypair")}
        </Button>
      )}
    </div>
  )
}
