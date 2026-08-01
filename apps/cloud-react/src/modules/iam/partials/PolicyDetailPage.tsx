import { useState } from "react"

import { Skeleton } from "@datadack/common-ui"
import { FileText, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

import { ConfirmDialog, CopyButton, DetailPage, KeyValueGrid, Section } from "@/components/console"
import { Button } from "@datadack/common-ui"
import { useScreen } from "@/services/api/screen"

import { IAM_ROUTES } from "../iam.constants"
import { useDeleteIAMPolicy, useIAMPolicy } from "../iam.hooks"

function prettyDocument(document: string): string {
  try {
    return JSON.stringify(JSON.parse(document), null, 4)
  } catch {
    return document
  }
}

export function PolicyDetailPage() {
  useScreen("iam.policy-detail")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = "" } = useParams()
  const { data: policy, isLoading } = useIAMPolicy(id)
  const { mutate: deletePolicy, isPending: isDeleting } = useDeleteIAMPolicy()
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (isLoading || !policy) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  const pretty = prettyDocument(policy.document)

  return (
    <>
      <DetailPage
        backTo={IAM_ROUTES.POLICIES}
        backLabel={t("iam.policies.title")}
        icon={FileText}
        title={policy.name}
        id={policy.id}
        actions={
          !policy.is_managed && (
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5"
              onClick={() => {
                setDeleteOpen(true)
              }}
            >
              <Trash2 className="size-3.5" />
              {t("iam.actions.deletePolicy")}
            </Button>
          )
        }
        tabs={[
          {
            value: "document",
            label: t("iam.policies.createForm.document"),
            icon: FileText,
            content: (
              <div className="space-y-5">
                <Section variant="panel" title={t("vms.tabs.overview")}>
                  <KeyValueGrid
                    columns={2}
                    items={[
                      {
                        label: t("iam.columns.description"),
                        value: policy.description,
                      },
                      {
                        label: t("iam.columns.type"),
                        value: policy.is_managed ? t("iam.badges.managed") : t("iam.badges.custom"),
                      },
                      {
                        label: t("common.updated"),
                        value: new Date(policy.updated_at).toLocaleString(),
                      },
                    ]}
                  />
                </Section>

                <Section
                  variant="panel"
                  title={t("iam.policies.createForm.document")}
                  actions={
                    <CopyButton value={pretty} label={t("iam.detail.copyDocument")} mono={false} />
                  }
                >
                  <pre className="glass-1 p-4 overflow-x-auto font-mono text-[12px] leading-relaxed text-foreground">
                    {pretty}
                  </pre>
                </Section>
              </div>
            ),
          },
        ]}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("iam.policies.deleteConfirm.title")}
        description={t("iam.policies.deleteConfirm.description", { name: policy.name })}
        confirmLabel={t("iam.actions.deletePolicy")}
        loading={isDeleting}
        onConfirm={() => {
          deletePolicy(policy.id, {
            onSuccess: () => void navigate(IAM_ROUTES.POLICIES),
          })
        }}
      />
    </>
  )
}
