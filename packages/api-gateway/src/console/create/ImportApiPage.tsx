import { useState } from "react"

import { FileInput } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"

import { Checkbox, Input, Label, PageHeader } from "@datadack/common-ui"

import { ImportWarnings } from "./ImportResult"
import { OpenApiSource, parseDefinition } from "./OpenApiSource"
import { FormError, Field, Section, WizardFooter, crumbLink, useGatewayBase } from "./parts"
import { useImportApi } from "../../data/queries"
import type { ImportApiResult } from "../../data/schemas"
import { errorMessage } from "../errorMessage"

/**
 * Import an HTTP or REST API from an OpenAPI definition — the "Import" button
 * on the type chooser. The protocol comes from the button that led here.
 */
export function ImportApiPage() {
  const navigate = useNavigate()
  const base = useGatewayBase()
  const [params] = useSearchParams()
  const protocol = params.get("type") === "REST" ? "REST" : "HTTP"
  const label = protocol === "REST" ? "REST API" : "HTTP API"

  const importApi = useImportApi()
  const [body, setBody] = useState("")
  const [name, setName] = useState("")
  const [failOnWarnings, setFailOnWarnings] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [result, setResult] = useState<ImportApiResult>()

  const { parsed, error: bodyError } = parseDefinition(body)
  const needsName = Boolean(parsed) && !parsed?.title && name.trim() === ""
  let nameError: string | undefined
  if (name.trim() !== "" && name.trim().length < 2) nameError = "Use at least 2 characters."
  else if (attempted && needsName) nameError = "The definition has no info.title, so enter a name."

  const open = (apiId: string) => {
    void navigate(`${base}/${encodeURIComponent(apiId)}`)
  }

  const submit = () => {
    setAttempted(true)
    if (bodyError || nameError || needsName) return
    importApi.mutate(
      { body, name: name.trim() || undefined, failOnWarnings, protocolType: protocol },
      {
        onSuccess: (imported) => {
          if (imported.warnings.length > 0) setResult(imported)
          else open(imported.api.apiId)
        },
      },
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title={`Import ${label}`}
        icon={FileInput}
        breadcrumbs={[
          { label: "API Gateway", to: base },
          { label: "Create API", to: `${base}/create` },
          { label: `Import ${label}` },
        ]}
        renderLink={crumbLink}
        description="Create an API, with its routes, from an existing OpenAPI definition."
      />

      {result ? (
        <ImportWarnings
          result={result}
          onOpen={() => {
            open(result.api.apiId)
          }}
        />
      ) : null}
      {importApi.error ? (
        <FormError
          title="The API was not imported"
          message={errorMessage(importApi.error, "Could not import the API.")}
        />
      ) : null}

      <Section title="Import API">
        <OpenApiSource value={body} onChange={setBody} error={attempted ? bodyError : undefined} />
        <Field
          label="API name"
          optional
          htmlFor="import-name"
          hint="Leave blank to use the definition's info.title."
          error={nameError}
        >
          <Input
            id="import-name"
            value={name}
            maxLength={128}
            placeholder={parsed?.title ? parsed.title : "orders-api"}
            onChange={(event) => {
              setName(event.target.value)
            }}
            className="max-w-xl"
          />
        </Field>
        <div className="flex items-start gap-3">
          <Checkbox
            id="import-strict"
            checked={failOnWarnings}
            onCheckedChange={(value) => {
              setFailOnWarnings(value === true)
            }}
            className="mt-0.5"
          />
          <div>
            <Label htmlFor="import-strict" className="text-foreground text-[13px] font-semibold">
              Fail on warnings
            </Label>
            <p className="text-muted-foreground text-xs">
              Create nothing if any part of the definition cannot be mapped to a route. Otherwise
              the rest is imported and you are shown what was skipped.
            </p>
          </div>
        </div>
      </Section>

      <WizardFooter
        onCancel={() => {
          void navigate(`${base}/create`)
        }}
        primaryLabel="Import"
        primaryLoading={importApi.isPending}
        primaryDisabled={Boolean(result)}
        onPrimary={submit}
      />
    </div>
  )
}
