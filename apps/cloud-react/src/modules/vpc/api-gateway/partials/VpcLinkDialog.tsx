import { useEffect, useState } from "react"

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@datadack/common-ui"
import { useTranslation } from "react-i18next"

import { useAllSecurityGroups, useAllSubnets, useRegions, useVPCs } from "../../vpc.hooks"
import { useCreateVPCLink, useUpdateVPCLink } from "../apigw.hooks"
import type { VPCLink } from "../apigw.types"

export function VpcLinkDialog({
  link,
  open,
  onClose,
}: Readonly<{ link: VPCLink | null; open: boolean; onClose: () => void }>) {
  const { t } = useTranslation()
  const { data: vpcs = [] } = useVPCs()
  const { data: subnets = [] } = useAllSubnets()
  const { data: groups = [] } = useAllSecurityGroups()
  const { data: regions = [] } = useRegions()
  const create = useCreateVPCLink()
  const update = useUpdateVPCLink()
  const [name, setName] = useState("")
  const [vpc, setVpc] = useState("")
  const [selectedSubnets, setSelectedSubnets] = useState<string[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setName(link?.name ?? "")
    setVpc(link?.vpc_id ?? "")
    setSelectedSubnets(link?.subnet_ids ?? [])
    setSelectedGroups(link?.security_group_ids ?? [])
  }, [open, link])

  const visibleSubnets = subnets.filter((s) => s.network_id === vpc)
  const visibleGroups = groups.filter((group) => group.network_id === vpc)
  const pending = create.isPending || update.isPending
  const toggle = (values: string[], id: string, checked: boolean) =>
    checked ? [...values, id] : values.filter((value) => value !== id)
  const submit = () => {
    const payload = { name, subnet_ids: selectedSubnets, security_group_ids: selectedGroups }
    if (link) {
      update.mutate({ id: link.id, payload }, { onSuccess: onClose })
      return
    }
    create.mutate(
      {
        ...payload,
        vpc_id: vpc,
        region: vpcs.find((item) => item.id === vpc)?.region ?? regions.at(0)?.code ?? "",
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="glass-3">
        <DialogHeader>
          <DialogTitle>
            {link ? t("apiGateway.vpcLinks.editTitle") : t("apiGateway.vpcLinks.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {link
              ? t("apiGateway.vpcLinks.editDescription")
              : t("apiGateway.vpcLinks.createDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Label>
            {t("apiGateway.vpcLinks.fields.name")}
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
            />
          </Label>
          <Label>
            {t("apiGateway.vpcLinks.fields.vpc")}
            <Select
              disabled={!!link}
              value={vpc}
              onValueChange={(value) => {
                setVpc(value)
                setSelectedSubnets([])
                setSelectedGroups([])
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("apiGateway.vpcLinks.vpcPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {vpcs.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Label>
          {link && (
            <p className="text-xs text-muted-foreground">{t("apiGateway.vpcLinks.vpcImmutable")}</p>
          )}
          <ChoiceList
            label={t("apiGateway.vpcLinks.fields.subnets")}
            items={visibleSubnets.map((item) => ({
              id: item.id,
              label: `${item.name} · ${item.cidr}`,
            }))}
            selected={selectedSubnets}
            onToggle={(id, checked) => {
              setSelectedSubnets((values) => toggle(values, id, checked))
            }}
          />
          <ChoiceList
            label={t("apiGateway.vpcLinks.fields.securityGroups")}
            items={visibleGroups.map((item) => ({ id: item.id, label: item.name }))}
            selected={selectedGroups}
            onToggle={(id, checked) => {
              setSelectedGroups((values) => toggle(values, id, checked))
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("apiGateway.common.cancel")}
          </Button>
          <Button
            variant="gold"
            disabled={pending || !name || !vpc || !selectedSubnets.length}
            loading={pending}
            onClick={submit}
          >
            {t("apiGateway.common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ChoiceList({
  label,
  items,
  selected,
  onToggle,
}: Readonly<{
  label: string
  items: { id: string; label: string }[]
  selected: string[]
  onToggle: (id: string, checked: boolean) => void
}>) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      {items.map((item) => (
        <label key={item.id} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={selected.includes(item.id)}
            onCheckedChange={(checked) => {
              onToggle(item.id, checked === true)
            }}
          />
          {item.label}
        </label>
      ))}
    </fieldset>
  )
}
