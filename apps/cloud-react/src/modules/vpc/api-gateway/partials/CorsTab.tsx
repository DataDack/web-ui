import { useState } from "react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  Checkbox,
  Input,
  Switch,
} from "@datadack/common-ui"
import { AlertTriangle } from "lucide-react"
import { useTranslation } from "react-i18next"

import { FieldRow, Section } from "@/components/console"

import { HTTP_METHODS } from "../apigw.constants"
import { useUpdateCORS } from "../apigw.hooks"
import type { APIGateway } from "../apigw.types"
const csv = (v: string) =>
  v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
export function CorsTab({ api }: Readonly<{ api: APIGateway }>) {
  const { t } = useTranslation()
  const save = useUpdateCORS()
  const [enabled, setEnabled] = useState(api.cors_enabled),
    [origins, setOrigins] = useState(api.cors_allow_origins.join(", ")),
    [methods, setMethods] = useState(api.cors_allow_methods),
    [headers, setHeaders] = useState(api.cors_allow_headers.join(", ")),
    [expose, setExpose] = useState(api.cors_expose_headers.join(", ")),
    [age, setAge] = useState(api.cors_max_age),
    [credentials, setCredentials] = useState(api.cors_allow_credentials)
  const values: [[string, string]] | [string, string][] = [
    ["Access-Control-Allow-Origin", origins],
    ["Access-Control-Allow-Methods", methods.join(", ")],
    ["Access-Control-Allow-Headers", headers],
    ["Access-Control-Expose-Headers", expose],
    ["Access-Control-Max-Age", String(age)],
    ["Access-Control-Allow-Credentials", String(credentials)],
  ]
  return (
    <div className="space-y-5">
      <Section
        variant="panel"
        title={t("apiGateway.cors.title")}
        description={t("apiGateway.cors.description")}
      >
        <FieldRow
          label={t("apiGateway.cors.enabled")}
          aside={<Switch checked={enabled} onCheckedChange={setEnabled} />}
        >
          <span />
        </FieldRow>
        {enabled && (
          <div className="mt-5 space-y-5">
            <FieldRow label={t("apiGateway.cors.origins")}>
              <Input
                value={origins}
                onChange={(e) => {
                  setOrigins(e.target.value)
                }}
                placeholder={t("apiGateway.cors.listPlaceholder")}
              />
            </FieldRow>
            <FieldRow label={t("apiGateway.cors.methods")}>
              <div className="flex flex-wrap gap-3">
                {["*", ...HTTP_METHODS].map((m) => (
                  <label key={m} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={methods.includes(m)}
                      onCheckedChange={(c) => {
                        setMethods(c ? [...methods, m] : methods.filter((x) => x !== m))
                      }}
                    />
                    <code>{m}</code>
                  </label>
                ))}
              </div>
            </FieldRow>
            <FieldRow label={t("apiGateway.cors.allowHeaders")}>
              <Input
                value={headers}
                onChange={(e) => {
                  setHeaders(e.target.value)
                }}
              />
            </FieldRow>
            <FieldRow label={t("apiGateway.cors.exposeHeaders")}>
              <Input
                value={expose}
                onChange={(e) => {
                  setExpose(e.target.value)
                }}
              />
            </FieldRow>
            <FieldRow
              label={t("apiGateway.cors.maxAge")}
              description={t("apiGateway.cors.seconds")}
            >
              <Input
                type="number"
                min={0}
                value={age}
                onChange={(e) => {
                  setAge(Number(e.target.value))
                }}
              />
            </FieldRow>
            <FieldRow
              label={t("apiGateway.cors.credentials")}
              aside={<Switch checked={credentials} onCheckedChange={setCredentials} />}
            >
              <span />
            </FieldRow>
            {credentials && csv(origins).includes("*") && (
              <Alert>
                <AlertTriangle className="size-4" />
                <AlertTitle>{t("apiGateway.cors.warningTitle")}</AlertTitle>
                <AlertDescription>
                  {t("apiGateway.cors.credentialsWildcardWarning")}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        <div className="mt-5 flex justify-end">
          <Button
            variant="gold"
            loading={save.isPending}
            onClick={() => {
              save.mutate({
                id: api.id,
                payload: {
                  enabled,
                  allow_origins: csv(origins),
                  allow_methods: methods,
                  allow_headers: csv(headers),
                  expose_headers: csv(expose),
                  max_age: age,
                  allow_credentials: credentials,
                },
              })
            }}
          >
            {t("apiGateway.common.save")}
          </Button>
        </div>
      </Section>
      {enabled && (
        <Section title={t("apiGateway.cors.preview")}>
          <Card className="glass-1 p-4">
            <pre className="overflow-auto text-xs">
              {values
                .filter(([, v]) => v)
                .map(([k, v]) => `${k}: ${v}`)
                .join("\n")}
            </pre>
          </Card>
        </Section>
      )}
    </div>
  )
}
