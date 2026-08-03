import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@datadack/common-ui"
import { Check, ChevronDown, FolderTree, Plus, Settings } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { staggerDelay } from "@/components/console"

import { useResourceGroup } from "../resource-group.context"
import { useResourceGroups, useSwitchResourceGroup } from "../resource-groups.hooks"

export function RGSelector() {
  const { t } = useTranslation()
  const { activeRG } = useResourceGroup()
  const { data: groups = [], isLoading } = useResourceGroups()
  const { mutate: switchRG } = useSwitchResourceGroup()
  const navigate = useNavigate()

  const displayName = activeRG?.name ?? (isLoading ? "…" : "select-rg")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Flat, two-line context control — caption over value, no pill. */}
        <Button
          variant="ghost"
          className="h-auto flex-col items-start gap-0 rounded-md border border-border-glass bg-surface-glass px-2.5 py-1 text-left hover:bg-accent/60"
        >
          <span className="text-[10px] font-medium uppercase leading-none tracking-wider text-muted-foreground">
            {t("nav.rgSelector")}
          </span>
          <span className="mt-1 flex items-center gap-1.5 leading-none">
            <FolderTree className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="max-w-32.5 truncate font-mono text-[13px] font-medium text-foreground">
              {displayName}
            </span>
            <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64 p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {t("nav.rgSelector")}
        </DropdownMenuLabel>

        {isLoading ? (
          <DropdownMenuItem disabled className="px-2 py-2 text-xs text-muted-foreground">
            {t("common.loading")}
          </DropdownMenuItem>
        ) : (
          groups.map((rg, index) => {
            const isActive = activeRG?.id === rg.id
            return (
              <DropdownMenuItem
                key={rg.id}
                onSelect={() => {
                  if (!isActive) switchRG(rg)
                }}
                style={staggerDelay(index)}
                className={cn(
                  "flex animate-content-enter cursor-pointer items-center gap-2.5 rounded-md px-2 py-2",
                  isActive && "bg-accent/60",
                )}
              >
                <span className="relative flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <FolderTree className="size-3.5" />
                  <span
                    className={cn(
                      "absolute -right-0.5 -top-0.5 size-2 rounded-full ring-2 ring-popover",
                      rg.status === "active" ? "bg-success-pulse" : "bg-outline",
                    )}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-[13px] font-medium">{rg.name}</div>
                  {rg.resourceCount != null && (
                    <div className="truncate text-[10px] text-muted-foreground">
                      {t("resourceGroups.resourceCountLabel", {
                        count: rg.resourceCount,
                      })}
                    </div>
                  )}
                </div>
                {isActive ? (
                  <Check className="size-4 shrink-0 text-brand-gold" />
                ) : (
                  rg.isDefault && (
                    <span className="shrink-0 rounded bg-muted px-1 font-mono text-[10px] text-muted-foreground">
                      {t("common.default")}
                    </span>
                  )
                )}
              </DropdownMenuItem>
            )
          })
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => void navigate("/resource-groups")}
          className="cursor-pointer gap-2.5 rounded-md px-2 py-2 text-[13px]"
        >
          <Settings className="size-3.5 text-muted-foreground" />
          {t("resourceGroups.manage")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => void navigate("/resource-groups")}
          className="cursor-pointer gap-2.5 rounded-md px-2 py-2 text-[13px]"
        >
          <Plus className="size-3.5 text-muted-foreground" />
          {t("resourceGroups.create")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
