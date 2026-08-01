import { useMemo, useState } from "react"

import { Label, Textarea } from "@datadack/common-ui"
import { ArrowLeft, Code2, FileText, Plus, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { PageHeader, Section } from "@/components/console"
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@datadack/common-ui"
import { useScreen } from "@/services/api/screen"

import { IAM_ROUTES } from "../iam.constants"
import { useCreateIAMPolicy } from "../iam.hooks"

interface StatementForm {
  sid: string
  effect: "Allow" | "Deny"
  actions: string // newline/comma separated
  resources: string
}

const emptyStatement = (): StatementForm => ({
  sid: "",
  effect: "Allow",
  actions: "",
  resources: "*",
})

function splitList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function buildDocument(statements: StatementForm[]): object {
  return {
    Version: "2025-01-01",
    Statement: statements.map((s) => {
      const stmt: Record<string, unknown> = {
        Effect: s.effect,
        Action: splitList(s.actions),
        Resource: splitList(s.resources),
      }
      if (s.sid.trim()) stmt.Sid = s.sid.trim()
      return stmt
    }),
  }
}

export function CreatePolicyPage() {
  useScreen("iam.create-policy")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { mutate: create, isPending } = useCreateIAMPolicy()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [statements, setStatements] = useState<StatementForm[]>([emptyStatement()])
  const [rawMode, setRawMode] = useState(false)
  const [rawJson, setRawJson] = useState("")
  const [error, setError] = useState("")

  const builtJson = useMemo(() => JSON.stringify(buildDocument(statements), null, 2), [statements])
  const documentJson = rawMode ? rawJson : builtJson

  const updateStatement = (index: number, patch: Partial<StatementForm>) => {
    setStatements((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  const removeStatement = (index: number) => {
    setStatements((prev) => prev.filter((_, i) => i !== index))
  }

  const toggleRaw = () => {
    if (!rawMode) setRawJson(builtJson)
    setRawMode((v) => !v)
  }

  const submit = () => {
    setError("")
    if (name.trim().length < 2) {
      setError(t("iam.policies.editor.nameRequired"))
      return
    }
    // Validate the document parses and has a non-empty statement with actions.
    let parsed: { Statement?: { Action?: unknown[] }[] }
    try {
      parsed = JSON.parse(documentJson)
    } catch {
      setError(t("iam.policies.editor.invalidJson"))
      return
    }
    const stmts = parsed.Statement ?? []
    if (stmts.length === 0 || !stmts.some((s) => Array.isArray(s.Action) && s.Action.length > 0)) {
      setError(t("iam.policies.editor.needAction"))
      return
    }
    create(
      { name: name.trim(), description: description.trim(), document: documentJson },
      { onSuccess: (policy) => void navigate(IAM_ROUTES.policyDetail(policy.id)) },
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={FileText}
        breadcrumbs={[
          { label: t("console.nav.groups.iam") },
          { label: t("iam.policies.title") },
          { label: t("iam.policies.create") },
        ]}
        title={t("iam.policies.editor.title")}
        description={t("iam.policies.editor.subtitle")}
        actions={
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => void navigate(IAM_ROUTES.POLICIES)}
          >
            <ArrowLeft className="w-4 h-4" />
            {t("iam.policies.title")}
          </Button>
        }
      />

      <Section variant="panel" title={t("iam.policies.editor.details")}>
        <div className="max-w-xl space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("iam.columns.name")}
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
              placeholder="vm-read-only"
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("iam.columns.description")}
            </Label>
            <Input
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
              }}
              placeholder={t("iam.policies.editor.descriptionPlaceholder")}
            />
          </div>
        </div>
      </Section>

      <Section
        variant="panel"
        title={t("iam.policies.editor.document")}
        description={t("iam.policies.editor.documentHint")}
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={toggleRaw}>
            <Code2 className="size-3.5" />
            {rawMode ? t("iam.policies.editor.useBuilder") : t("iam.policies.editor.useJson")}
          </Button>
        }
      >
        {rawMode ? (
          <Textarea
            value={rawJson}
            onChange={(e) => {
              setRawJson(e.target.value)
            }}
            rows={16}
            spellCheck={false}
            className="font-mono text-[12px] resize-y"
          />
        ) : (
          <div className="space-y-4">
            {statements.map((s, index) => (
              <StatementRow
                key={index}
                statement={s}
                canRemove={statements.length > 1}
                onChange={(patch) => {
                  updateStatement(index, patch)
                }}
                onRemove={() => {
                  removeStatement(index)
                }}
              />
            ))}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setStatements((prev) => [...prev, emptyStatement()])
              }}
            >
              <Plus className="size-3.5" />
              {t("iam.policies.editor.addStatement")}
            </Button>

            <div className="space-y-1.5 pt-1">
              <Label className="text-[11px] text-muted-foreground">
                {t("iam.policies.editor.preview")}
              </Label>
              <pre className="glass-1 p-3 overflow-auto text-[11px] font-mono text-muted-foreground max-h-64">
                {builtJson}
              </pre>
            </div>
          </div>
        )}

        {error && <p className="text-[12px] text-destructive mt-3">{error}</p>}

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={() => void navigate(IAM_ROUTES.POLICIES)}>
            {t("console.wizard.cancel")}
          </Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending ? t("iam.policies.createForm.creating") : t("iam.policies.create")}
          </Button>
        </div>
      </Section>
    </div>
  )
}

function StatementRow({
  statement,
  canRemove,
  onChange,
  onRemove,
}: Readonly<{
  statement: StatementForm
  canRemove: boolean
  onChange: (patch: Partial<StatementForm>) => void
  onRemove: () => void
}>) {
  const { t } = useTranslation()
  return (
    <div className="glass-1 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select
            value={statement.effect}
            onValueChange={(v) => {
              onChange({ effect: v as "Allow" | "Deny" })
            }}
          >
            <SelectTrigger className="w-28 h-8 text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Allow">Allow</SelectItem>
              <SelectItem value="Deny">Deny</SelectItem>
            </SelectContent>
          </Select>
          <Input
            value={statement.sid}
            onChange={(e) => {
              onChange({ sid: e.target.value })
            }}
            placeholder={t("iam.policies.editor.sid")}
            className="h-8 w-44 text-[13px]"
          />
        </div>
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            aria-label={t("iam.policies.editor.removeStatement")}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">
            {t("iam.policies.editor.actions")}
          </Label>
          <Textarea
            value={statement.actions}
            onChange={(e) => {
              onChange({ actions: e.target.value })
            }}
            placeholder={"vm:instances:get\nvm:instances:list"}
            rows={3}
            className="font-mono text-[12px] resize-none"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">
            {t("iam.policies.editor.resources")}
          </Label>
          <Textarea
            value={statement.resources}
            onChange={(e) => {
              onChange({ resources: e.target.value })
            }}
            placeholder={"urn:cloud:vm:*:instances/*"}
            rows={3}
            className="font-mono text-[12px] resize-none"
          />
        </div>
      </div>
    </div>
  )
}
