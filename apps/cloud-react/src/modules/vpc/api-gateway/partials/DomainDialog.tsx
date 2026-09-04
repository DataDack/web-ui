import { useEffect, useState } from "react"

import {
  Button,
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

import { useRegions } from "../../vpc.hooks"
import { useCreateDomain, useUpdateDomain } from "../apigw.hooks"
import type { DomainName, EndpointType, IPAddressType, SecurityPolicy } from "../apigw.types"

export function DomainDialog({
  domain,
  open,
  onClose,
}: Readonly<{ domain: DomainName | null; open: boolean; onClose: () => void }>) {
  const { t } = useTranslation()
  const { data: regions = [] } = useRegions()
  const create = useCreateDomain()
  const update = useUpdateDomain()
  const [name, setName] = useState("")
  const [region, setRegion] = useState("")
  const [endpointType, setEndpointType] = useState<EndpointType>("REGIONAL")
  const [securityPolicy, setSecurityPolicy] = useState<SecurityPolicy>("TLS_1_2")
  const [ipAddressType, setIpAddressType] = useState<IPAddressType>("ipv4")
  const [certificateId, setCertificateId] = useState("")

  useEffect(() => {
    if (!open) return
    setName(domain?.domain_name ?? "")
    setRegion(domain?.region ?? "")
    setEndpointType(domain?.endpoint_type ?? "REGIONAL")
    setSecurityPolicy(domain?.security_policy ?? "TLS_1_2")
    setIpAddressType(domain?.ip_address_type ?? "ipv4")
    setCertificateId(domain?.certificate_id ?? "")
  }, [open, domain])

  const pending = create.isPending || update.isPending
  const submit = () => {
    const payload = {
      endpoint_type: endpointType,
      security_policy: securityPolicy,
      ip_address_type: ipAddressType,
      certificate_id: certificateId,
    }
    if (domain) {
      update.mutate({ id: domain.id, payload }, { onSuccess: onClose })
      return
    }
    create.mutate({ domain_name: name, region, ...payload }, { onSuccess: onClose })
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
            {domain ? t("apiGateway.domains.editTitle") : t("apiGateway.domains.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {domain
              ? t("apiGateway.domains.editDescription")
              : t("apiGateway.domains.createDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Label>
            {t("apiGateway.domains.fields.domain")}
            <Input
              className="font-mono"
              value={name}
              disabled={!!domain}
              onChange={(e) => {
                setName(e.target.value)
              }}
            />
          </Label>
          {domain ? (
            <p className="text-xs text-muted-foreground">{t("apiGateway.domains.nameImmutable")}</p>
          ) : (
            <Label>
              {t("apiGateway.domains.fields.region")}
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((r) => (
                    <SelectItem value={r.code} key={r.code}>
                      {r.code} — {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Label>
          )}
          <Label>
            {t("apiGateway.domains.fields.endpointType")}
            <Select
              value={endpointType}
              onValueChange={(value) => {
                setEndpointType(value as EndpointType)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["REGIONAL", "EDGE", "PRIVATE"] as const).map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`apiGateway.domains.endpointTypes.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Label>
          <Label>
            {t("apiGateway.domains.fields.securityPolicy")}
            <Select
              value={securityPolicy}
              onValueChange={(value) => {
                setSecurityPolicy(value as SecurityPolicy)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["TLS_1_0", "TLS_1_2"] as const).map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`apiGateway.domains.securityPolicies.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Label>
          <Label>
            {t("apiGateway.domains.fields.ipAddressType")}
            <Select
              value={ipAddressType}
              onValueChange={(value) => {
                setIpAddressType(value as IPAddressType)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ipv4">{t("apiGateway.domains.ipAddressTypes.ipv4")}</SelectItem>
                <SelectItem value="dualstack">
                  {t("apiGateway.domains.ipAddressTypes.dualstack")}
                </SelectItem>
              </SelectContent>
            </Select>
          </Label>
          <Label>
            {t("apiGateway.domains.fields.certificateId")}
            <Input
              value={certificateId}
              onChange={(e) => {
                setCertificateId(e.target.value)
              }}
            />
          </Label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("apiGateway.common.cancel")}
          </Button>
          <Button
            variant="gold"
            disabled={pending || !name || (!domain && !region)}
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
