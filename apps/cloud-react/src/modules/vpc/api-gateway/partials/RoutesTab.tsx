/* eslint-disable @typescript-eslint/no-confusing-void-expression, react-hooks/exhaustive-deps, sonarjs/no-nested-template-literals */
import { useMemo, useState } from "react"

import {
  actionsColumn,
  Badge,
  Button,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  type RowAction,
} from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import type { ColumnDef } from "@tanstack/react-table"
import { GitBranch, Pencil, Plus, Trash2 } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import { ConfirmDialog, FieldRow, SegmentedControl } from "@/components/console"

import { AUTH_TYPE_OPTIONS, HTTP_METHODS } from "../apigw.constants"
import {
  useAuthorizers,
  useCreateRoute,
  useDeleteRoute,
  useIntegrations,
  useRoutes,
  useUpdateRoute,
} from "../apigw.hooks"
import type { APIGateway, APIGatewayRoute } from "../apigw.types"

const schema = z.object({
  method: z.string().min(1),
  path: z.string().min(1),
  integration: z.string(),
  operation: z.string(),
  authorization: z.enum(["NONE", "JWT", "AWS_IAM", "CUSTOM"]),
  authorizer: z.string(),
  scopes: z.string(),
  apiKey: z.boolean(),
  isDefault: z.boolean(),
  parameters: z.string(),
})
type Values = z.infer<typeof schema>
export function RoutesTab({ api }: Readonly<{ api: APIGateway }>) {
  const { t } = useTranslation()
  const query = useRoutes(api.id)
  const integrations = useIntegrations(api.id)
  const authorizers = useAuthorizers(api.id)
  const create = useCreateRoute()
  const update = useUpdateRoute()
  const remove = useDeleteRoute()
  const [editing, setEditing] = useState<APIGatewayRoute | null | undefined>()
  const [deleting, setDeleting] = useState<APIGatewayRoute | null>(null)
  const integrationName = (id?: string) => integrations.data?.find((x) => x.id === id)?.name
  const columns = useMemo<ColumnDef<APIGatewayRoute>[]>(
    () => [
      {
        accessorKey: "route_key",
        header: t("apiGateway.routes.columns.route"),
        cell: ({ row }) => (
          <code>
            {row.original.route_key === "$default" ? (
              <>
                {t("apiGateway.routes.default")}{" "}
                <span className="text-muted-foreground">$default</span>
              </>
            ) : (
              row.original.route_key
            )}
          </code>
        ),
      },
      {
        accessorKey: "method",
        header: t("apiGateway.routes.columns.method"),
        cell: ({ getValue }) => <Badge variant="outline">{String(getValue())}</Badge>,
      },
      { accessorKey: "path", header: t("apiGateway.routes.columns.path") },
      {
        id: "integration",
        header: t("apiGateway.routes.columns.integration"),
        cell: ({ row }) =>
          integrationName(row.original.target_integration_id) ?? (
            <button
              onClick={() => {
                setEditing(row.original)
              }}
            >
              <Badge variant="outline">{t("apiGateway.routes.unattached")}</Badge>
            </button>
          ),
      },
      {
        id: "authorization",
        header: t("apiGateway.routes.columns.authorization"),
        cell: ({ row }) =>
          `${AUTH_TYPE_OPTIONS.find((x) => x.value === row.original.authorization_type)?.label ?? row.original.authorization_type}${row.original.authorizer_id ? ` · ${authorizers.data?.find((x) => x.id === row.original.authorizer_id)?.name ?? ""}` : ""}`,
      },
      {
        accessorKey: "api_key_required",
        header: t("apiGateway.routes.columns.apiKey"),
        cell: ({ getValue }) =>
          getValue() ? t("apiGateway.common.yes") : t("apiGateway.common.no"),
      },
      actionsColumn<APIGatewayRoute>({
        ariaLabel: t("console.table.actions"),
        actions: () =>
          [
            { label: t("apiGateway.common.edit"), icon: Pencil, onAction: setEditing },
            {
              label: t("apiGateway.common.delete"),
              icon: Trash2,
              destructive: true,
              onAction: setDeleting,
            },
          ] as RowAction<APIGatewayRoute>[],
      }),
    ],
    [t, integrations.data, authorizers.data],
  )
  return (
    <div className="space-y-5">
      <DataTable
        data={query.data ?? []}
        columns={columns}
        loading={query.isLoading}
        error={query.error?.message}
        onRetry={() => void query.refetch()}
        searchable
        onRefresh={() => void query.refetch()}
        refreshing={query.isFetching}
        actions={
          <Button
            variant="gold"
            onClick={() => {
              setEditing(null)
            }}
          >
            <Plus className="size-4" />
            {t("apiGateway.routes.create")}
          </Button>
        }
        empty={
          <EmptyState
            icon={GitBranch}
            title={t("apiGateway.routes.empty.title")}
            description={t("apiGateway.routes.empty.description")}
            action={{
              label: t("apiGateway.routes.create"),
              onClick: () => {
                setEditing(null)
              },
            }}
          />
        }
      />
      {editing !== undefined && (
        <RouteDialog
          route={editing}
          apiId={api.id}
          integrations={integrations.data ?? []}
          authorizers={authorizers.data ?? []}
          onClose={() => {
            setEditing(undefined)
          }}
          onSave={(v) => {
            const request = {
              route_key: v.isDefault ? "$default" : `${v.method} ${v.path}`,
              method: v.isDefault ? "ANY" : v.method,
              path: v.isDefault ? "$default" : v.path,
              target_integration_id: v.integration || undefined,
              operation_name: v.operation,
              authorization_type: v.authorization,
              authorizer_id: v.authorizer || undefined,
              authorization_scopes: v.scopes
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean),
              api_key_required: v.apiKey,
              request_parameters: Object.fromEntries(
                v.parameters
                  .split("\n")
                  .filter(Boolean)
                  .map((x) => [x.trim(), true]),
              ),
            }
            if (editing)
              update.mutate(
                { apiId: api.id, routeId: editing.id, payload: request },
                {
                  onSuccess: () => {
                    setEditing(undefined)
                  },
                },
              )
            else
              create.mutate(
                { apiId: api.id, payload: request },
                {
                  onSuccess: () => {
                    setEditing(undefined)
                  },
                },
              )
          }}
          pending={create.isPending || update.isPending}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("apiGateway.routes.deleteTitle", { name: deleting?.route_key ?? "" })}
        description={t("apiGateway.routes.deleteDescription", { name: deleting?.route_key ?? "" })}
        confirmLabel={t("apiGateway.common.delete")}
        loading={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(
            { apiId: api.id, routeId: deleting.id },
            {
              onSuccess: () => {
                setDeleting(null)
              },
            },
          )
        }
      />
    </div>
  )
}
function RouteDialog({
  route,
  apiId: _,
  integrations,
  authorizers,
  onClose,
  onSave,
  pending,
}: Readonly<{
  route: APIGatewayRoute | null
  apiId: string
  integrations: { id: string; name: string }[]
  authorizers: { id: string; name: string }[]
  onClose: () => void
  onSave: (v: Values) => void
  pending: boolean
}>) {
  const { t } = useTranslation()
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      method: route?.method ?? "GET",
      path: route?.path ?? "/",
      integration: route?.target_integration_id ?? "",
      operation: route?.operation_name ?? "",
      authorization: route?.authorization_type ?? "NONE",
      authorizer: route?.authorizer_id ?? "",
      scopes: route?.authorization_scopes.join(", ") ?? "",
      apiKey: route?.api_key_required ?? false,
      isDefault: route?.route_key === "$default",
      parameters: Object.keys(route?.request_parameters ?? {}).join("\n"),
    },
  })
  const auth = watch("authorization"),
    isDefault = watch("isDefault")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-3 max-h-[90vh] overflow-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {t(route ? "apiGateway.routes.edit" : "apiGateway.routes.create")}
          </DialogTitle>
          <DialogDescription>{t("apiGateway.routes.dialogDescription")}</DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={(e) => void handleSubmit(onSave)(e)}>
          <Controller
            control={control}
            name="isDefault"
            render={({ field }) => (
              <FieldRow
                label={t("apiGateway.routes.default")}
                aside={<Switch checked={field.value} onCheckedChange={field.onChange} />}
              >
                <p className="text-xs text-muted-foreground">
                  {t("apiGateway.routes.defaultHelp")}
                </p>
              </FieldRow>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="method"
              render={({ field }) => (
                <FieldRow label={t("apiGateway.routes.method")}>
                  <Select disabled={isDefault} value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HTTP_METHODS.map((x) => (
                        <SelectItem key={x} value={x}>
                          {x}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldRow>
              )}
            />
            <FieldRow label={t("apiGateway.routes.path")} error={errors.path?.message}>
              <Input disabled={isDefault} {...register("path")} />
            </FieldRow>
          </div>
          <Controller
            control={control}
            name="integration"
            render={({ field }) => (
              <FieldRow label={t("apiGateway.routes.integration")}>
                <Select
                  value={field.value || "none"}
                  onValueChange={(v) => {
                    field.onChange(v === "none" ? "" : v)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("apiGateway.routes.unattached")}</SelectItem>
                    {integrations.map((x) => (
                      <SelectItem key={x.id} value={x.id}>
                        {x.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>
            )}
          />
          <FieldRow label={t("apiGateway.routes.operationName")}>
            <Input {...register("operation")} />
          </FieldRow>
          <Controller
            control={control}
            name="authorization"
            render={({ field }) => (
              <FieldRow label={t("apiGateway.routes.authorization")}>
                <SegmentedControl
                  value={field.value}
                  onValueChange={field.onChange}
                  options={AUTH_TYPE_OPTIONS.map((x) => ({ value: x.value, label: x.label }))}
                />
              </FieldRow>
            )}
          />
          {(auth === "JWT" || auth === "CUSTOM") && (
            <>
              <Controller
                control={control}
                name="authorizer"
                render={({ field }) => (
                  <FieldRow label={t("apiGateway.routes.authorizer")}>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {authorizers.map((x) => (
                          <SelectItem key={x.id} value={x.id}>
                            {x.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldRow>
                )}
              />
              <FieldRow label={t("apiGateway.routes.scopes")}>
                <Input {...register("scopes")} />
              </FieldRow>
            </>
          )}
          <Controller
            control={control}
            name="apiKey"
            render={({ field }) => (
              <FieldRow
                label={t("apiGateway.routes.apiKeyRequired")}
                aside={<Switch checked={field.value} onCheckedChange={field.onChange} />}
              >
                <span />
              </FieldRow>
            )}
          />
          <FieldRow
            label={t("apiGateway.routes.requestParameters")}
            description={t("apiGateway.routes.requestParametersHelp")}
          >
            <textarea
              className="min-h-20 w-full rounded-md border bg-transparent p-3 font-mono text-sm"
              {...register("parameters")}
            />
          </FieldRow>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("console.wizard.cancel")}
            </Button>
            <Button type="submit" variant="gold" loading={pending}>
              {t("apiGateway.common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
