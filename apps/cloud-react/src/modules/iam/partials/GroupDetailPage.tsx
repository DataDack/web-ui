import { useState } from "react"

import { FileText, Info, Loader2, Plus, Trash2, Users, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useParams } from "react-router-dom"

import {
  ConfirmDialog,
  DetailPage,
  EmptyState,
  KeyValueGrid,
  Section,
  staggerDelay,
} from "@/components/console"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useScreen } from "@/services/api/screen"

import { Skeleton } from "@datadack/serverless-ui"

import { IAM_ROUTES } from "../iam.constants"
import {
  useAddGroupMember,
  useAttachGroupPolicy,
  useDeleteIAMGroup,
  useDetachGroupPolicy,
  useGroupMembers,
  useGroupPolicies,
  useIAMGroup,
  useIAMPolicies,
  useIAMUsers,
  useRemoveGroupMember,
} from "../iam.hooks"
import type { IAMGroup } from "../iam.types"

export function GroupDetailPage() {
  useScreen("iam.group-detail")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = "" } = useParams()
  const { data: group, isLoading } = useIAMGroup(id)
  const { mutate: deleteGroup, isPending: isDeleting } = useDeleteIAMGroup()
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (isLoading || !group) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  return (
    <>
      <DetailPage
        backTo={IAM_ROUTES.GROUPS}
        backLabel={t("iam.groups.title")}
        icon={Users}
        title={group.name}
        id={group.id}
        actions={
          <Button
            size="sm"
            variant="destructive"
            className="gap-1.5"
            onClick={() => {
              setDeleteOpen(true)
            }}
          >
            <Trash2 className="size-3.5" />
            {t("iam.actions.deleteGroup")}
          </Button>
        }
        tabs={[
          {
            value: "overview",
            label: t("vms.tabs.overview"),
            icon: Info,
            content: <OverviewTab group={group} />,
          },
          {
            value: "members",
            label: t("iam.detail.members"),
            icon: Users,
            content: <MembersTab groupId={group.id} />,
          },
          {
            value: "policies",
            label: t("iam.policies.title"),
            icon: FileText,
            content: <PoliciesTab groupId={group.id} />,
          },
        ]}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("iam.groups.deleteConfirm.title")}
        description={t("iam.groups.deleteConfirm.description", { name: group.name })}
        confirmLabel={t("iam.actions.deleteGroup")}
        confirmText={group.name}
        loading={isDeleting}
        onConfirm={() => {
          deleteGroup(group.id, {
            onSuccess: () => void navigate(IAM_ROUTES.GROUPS),
          })
        }}
      />
    </>
  )
}

function OverviewTab({ group }: Readonly<{ group: IAMGroup }>) {
  const { t } = useTranslation()
  return (
    <Section variant="panel" title={t("vms.detail.configuration")}>
      <KeyValueGrid
        columns={2}
        items={[
          { label: t("iam.columns.description"), value: group.description },
          { label: t("iam.columns.path"), value: group.path },
          {
            label: t("common.created"),
            value: new Date(group.created_at).toLocaleString(),
          },
          {
            label: t("common.updated"),
            value: new Date(group.updated_at).toLocaleString(),
          },
        ]}
      />
    </Section>
  )
}

function MembersTab({ groupId }: Readonly<{ groupId: string }>) {
  const { t } = useTranslation()
  const { data: members = [], isLoading } = useGroupMembers(groupId)
  const { data: users = [] } = useIAMUsers()
  const { mutate: addMember, isPending: isAdding } = useAddGroupMember()
  const { mutate: removeMember } = useRemoveGroupMember()
  const [selectedUser, setSelectedUser] = useState("")

  const memberIds = new Set(members.map((m) => m.user_id))
  const addable = users.filter((u) => !memberIds.has(u.id))

  if (isLoading) {
    return <Skeleton className="h-48 rounded-xl" />
  }

  return (
    <Section
      variant="panel"
      title={t("iam.detail.members")}
      description={t("iam.detail.groupMembersDescription")}
      actions={
        <div className="flex items-center gap-2">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-52 h-8 text-[13px]">
              <SelectValue placeholder={t("iam.detail.selectUser")} />
            </SelectTrigger>
            <SelectContent>
              {addable.map((user) => (
                <SelectItem key={user.id} value={user.id} className="text-[13px]">
                  {user.name} ({user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-8 gap-1.5"
            disabled={!selectedUser || isAdding}
            onClick={() => {
              addMember(
                { groupId, userId: selectedUser },
                {
                  onSuccess: () => {
                    setSelectedUser("")
                  },
                },
              )
            }}
          >
            {isAdding ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            {t("iam.detail.addMember")}
          </Button>
        </div>
      }
    >
      {members.length === 0 ? (
        <EmptyState icon={Users} title={t("iam.detail.noMembers")} />
      ) : (
        <ul className="space-y-2">
          {members.map((member, index) => {
            const user = users.find((u) => u.id === member.user_id)
            return (
              <li
                key={member.id}
                className="glass-1 flex items-center justify-between gap-3 px-3.5 py-2.5 animate-content-enter"
                style={staggerDelay(index)}
              >
                <div className="min-w-0">
                  <Link
                    to={IAM_ROUTES.userDetail(member.user_id)}
                    className="text-sm font-medium text-status-info hover:underline"
                  >
                    {user?.name ?? member.user_id}
                  </Link>
                  {user && (
                    <p className="font-mono text-[11px] text-muted-foreground">{user.email}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1.5 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => {
                    removeMember({ groupId, userId: member.user_id })
                  }}
                >
                  <X className="size-3" />
                  {t("iam.detail.removeMember")}
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}

function PoliciesTab({ groupId }: Readonly<{ groupId: string }>) {
  const { t } = useTranslation()
  const { data: bindings = [], isLoading } = useGroupPolicies(groupId)
  const { data: policies = [] } = useIAMPolicies()
  const { mutate: attachPolicy, isPending: isAttaching } = useAttachGroupPolicy()
  const { mutate: detachPolicy } = useDetachGroupPolicy()
  const [selectedPolicy, setSelectedPolicy] = useState("")

  const attachedIds = new Set(bindings.map((b) => b.policy_id))
  const attachable = policies.filter((policy) => !attachedIds.has(policy.id))

  if (isLoading) {
    return <Skeleton className="h-48 rounded-xl" />
  }

  return (
    <Section
      variant="panel"
      title={t("iam.detail.attachedPolicies")}
      description={t("iam.detail.attachedPoliciesDescription")}
      actions={
        <div className="flex items-center gap-2">
          <Select value={selectedPolicy} onValueChange={setSelectedPolicy}>
            <SelectTrigger className="w-52 h-8 font-mono text-[13px]">
              <SelectValue placeholder={t("iam.detail.selectPolicy")} />
            </SelectTrigger>
            <SelectContent>
              {attachable.map((policy) => (
                <SelectItem key={policy.id} value={policy.id} className="font-mono text-[13px]">
                  {policy.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-8 gap-1.5"
            disabled={!selectedPolicy || isAttaching}
            onClick={() => {
              attachPolicy(
                { groupId, policyId: selectedPolicy },
                {
                  onSuccess: () => {
                    setSelectedPolicy("")
                  },
                },
              )
            }}
          >
            {isAttaching ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            {t("iam.actions.attachPolicy")}
          </Button>
        </div>
      }
    >
      {bindings.length === 0 ? (
        <EmptyState icon={FileText} title={t("iam.detail.noPolicies")} />
      ) : (
        <ul className="space-y-2">
          {bindings.map((binding, index) => {
            const policy = policies.find((p) => p.id === binding.policy_id)
            return (
              <li
                key={binding.id}
                className="glass-1 flex items-center justify-between gap-3 px-3.5 py-2.5 animate-content-enter"
                style={staggerDelay(index)}
              >
                <div className="min-w-0">
                  <Link
                    to={IAM_ROUTES.policyDetail(binding.policy_id)}
                    className="font-mono text-[13px] font-medium text-status-info hover:underline"
                  >
                    {policy?.name ?? binding.policy_id}
                  </Link>
                  {policy?.description && (
                    <p className="text-[12px] text-muted-foreground truncate">
                      {policy.description}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1.5 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => {
                    detachPolicy({ groupId, policyId: binding.policy_id })
                  }}
                >
                  <X className="size-3" />
                  {t("iam.actions.detachPolicy")}
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}
