import { useTranslation } from "react-i18next"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
} from "@datadack/common-ui"
import { Network } from "lucide-react"

import { SmartSelect, type SmartSelectOption } from "@/components/console"
import { useVPCs, useVPCSubnets } from "@/modules/vpc/vpc.hooks"
import type { Subnet, VPCNetwork } from "@/modules/vpc/vpc.types"

interface NetworkingSectionProps {
  vpcId: string
  subnetId: string
  onChange: (patch: { vpc_id?: string; subnet_id?: string }) => void
  vpcError?: string
}

/**
 * Optional private networking.
 *
 * Collapsed by default and explicitly labelled optional: the overwhelming
 * majority of projects are public-only, and a required-looking network picker
 * at creation time is a decision most users cannot yet make.
 *
 * The copy states plainly that nothing is attached yet. The backend validates
 * and stores the binding now and applies it when a runtime container is
 * provisioned — promising connectivity today would be a lie.
 */
export function NetworkingSection({
  vpcId,
  subnetId,
  onChange,
  vpcError,
}: Readonly<NetworkingSectionProps>) {
  const { t } = useTranslation()
  const { data: vpcs = [], isLoading: vpcsLoading, isError: vpcsError, refetch } = useVPCs()
  const { data: subnets = [], isLoading: subnetsLoading } = useVPCSubnets(vpcId)

  const vpcOptions: SmartSelectOption<VPCNetwork>[] = vpcs.map((vpc) => ({
    value: vpc.id,
    item: vpc,
    searchText: `${vpc.name} ${vpc.cidr} ${vpc.region}`,
    // The backend refuses a VPC that is not available yet; saying so here
    // beats a rejected submit.
    disabled: vpc.status !== "available" && vpc.status !== "active",
    disabledReason:
      vpc.status !== "available" && vpc.status !== "active"
        ? `Not usable yet — ${vpc.status}`
        : undefined,
  }))

  const subnetOptions: SmartSelectOption<Subnet>[] = subnets.map((subnet) => ({
    value: subnet.id,
    item: subnet,
    searchText: `${subnet.name} ${subnet.cidr}`,
    disabled: subnet.status != null && subnet.status !== "available",
    disabledReason:
      subnet.status != null && subnet.status !== "available"
        ? `Not usable yet — ${subnet.status}`
        : undefined,
  }))

  const bound = vpcId !== ""

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="networking" className="border-border/60">
        <AccordionTrigger className="text-[13px] font-semibold hover:no-underline">
          <span className="flex items-center gap-2">
            <Network className="size-3.5 text-muted-foreground" />
            {t("managedApps.networkingSection.privateNetworking")}
            <span className="text-[11px] font-normal text-muted-foreground">
              {bound ? "bound" : "optional · public only"}
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-1">
          <p className="text-[11px] text-muted-foreground">
            Stored now and applied when a runtime container is provisioned. Nothing is attached and
            no address is reserved yet.
          </p>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              VPC
            </span>
            <SmartSelect<VPCNetwork>
              ariaLabel="VPC"
              options={vpcOptions}
              value={vpcId || undefined}
              loading={vpcsLoading}
              error={vpcsError}
              onRefresh={() => void refetch()}
              invalid={Boolean(vpcError)}
              placeholder={t("managedApps.networkingSection.publicOnlyNoVpc")}
              searchPlaceholder="Search VPCs…"
              emptyText="This account has no VPCs yet."
              noMatchText={(q) => `No VPC matches “${q}”.`}
              onValueChange={(next) => {
                // A subnet belongs to the VPC it was chosen under.
                onChange({ vpc_id: next, subnet_id: "" })
              }}
              renderRow={(option) => ({
                primary: option.item.name,
                secondary: `${option.item.cidr} · ${option.item.region}`,
                trailing: option.item.is_default ? (
                  <Badge variant="outline" className="text-[10px]">
                    default
                  </Badge>
                ) : undefined,
              })}
            />
            {vpcError && <p className="text-[11px] text-destructive">{vpcError}</p>}
          </div>

          {bound && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Subnet
              </span>
              <SmartSelect<Subnet>
                ariaLabel="Subnet"
                options={subnetOptions}
                value={subnetId || undefined}
                loading={subnetsLoading}
                placeholder={t("managedApps.networkingSection.anySubnetInThisVpc")}
                searchPlaceholder="Search subnets…"
                emptyText="This VPC has no subnets yet."
                noMatchText={(q) => `No subnet matches “${q}”.`}
                onValueChange={(next) => {
                  onChange({ subnet_id: next })
                }}
                renderRow={(option) => ({
                  primary: option.item.name,
                  secondary: option.item.cidr,
                  trailing: (
                    <Badge variant="outline" className="text-[10px]">
                      {option.item.is_public ? "public" : "private"}
                    </Badge>
                  ),
                })}
              />
            </div>
          )}

          {bound && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[12px] text-muted-foreground"
              onClick={() => {
                onChange({ vpc_id: "", subnet_id: "" })
              }}
            >
              {t("managedApps.networkingSection.removeBindingDeployPublicOnly")}
            </Button>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
