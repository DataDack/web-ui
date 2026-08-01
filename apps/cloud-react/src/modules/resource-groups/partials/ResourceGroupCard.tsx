import { Check, Eye, Hash, Pencil, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useResourceGroup } from "@/modules/resource-groups/resource-group.context"

import { RG_ROUTES } from "../resource-groups.constants"
import { useDeleteResourceGroup, useSwitchResourceGroup } from "../resource-groups.hooks"
import type { ResourceGroup } from "../resource-groups.types"

interface Props {
  rg: ResourceGroup
}

export function ResourceGroupCard({ rg }: Readonly<Props>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { activeRG } = useResourceGroup()
  const { mutate: switchRG, isPending: isSwitching } = useSwitchResourceGroup()
  const { mutate: deleteRG, isPending: isDeleting } = useDeleteResourceGroup()

  const isActive = activeRG?.id === rg.id
  const tagEntries = Object.entries(rg.tags)

  const handleSetActive = () => {
    if (!isActive) switchRG(rg)
  }
  const handleDelete = () => {
    if (!rg.isDefault) deleteRG(rg.id)
  }
  const goToDetail = () => void navigate(RG_ROUTES.detail(rg.id))
  const goToEdit = () => void navigate(`${RG_ROUTES.detail(rg.id)}?edit=1`)

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className="glass-2 p-5 flex flex-col gap-4 relative"
          style={{
            outline: isActive ? "2px solid var(--primary)" : undefined,
            outlineOffset: "-1px",
          }}
        >
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background:
                    rg.status === "active" ? "var(--success-pulse)" : "var(--bsc-outline)",
                }}
              />
              <span className="font-mono text-xs text-muted-foreground">
                {t(`common.status.${rg.status}`)}
                {rg.isDefault && (
                  <Badge variant="secondary" className="ml-2 text-[10px] py-0">
                    {t("common.default")}
                  </Badge>
                )}
              </span>
            </div>
            <h3 className="font-semibold text-foreground">{rg.displayName ?? rg.name}</h3>
            {/* Only show the slug when it differs from the display name,
                            otherwise it reads as a duplicate (e.g. "default"/"default"). */}
            {rg.displayName && rg.displayName !== rg.name && (
              <p className="font-mono text-xs text-muted-foreground mt-0.5">{rg.name}</p>
            )}
          </div>

          {/* Description */}
          {rg.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{rg.description}</p>
          )}

          {/* Tags */}
          {tagEntries.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tagEntries.slice(0, 4).map(([k, v]) => (
                <Badge
                  key={k}
                  variant="outline"
                  className="font-mono text-[11px] gap-1 px-1.5 py-0 h-5"
                >
                  <Hash className="w-2.5 h-2.5" />
                  {k}: {v}
                </Badge>
              ))}
              {tagEntries.length > 4 && (
                <span className="text-[11px] text-muted-foreground self-center">
                  +{tagEntries.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* Timestamps */}
          <div
            className="flex items-center gap-4 pt-3 text-[11px] font-mono text-muted-foreground"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <span>
              {t("common.created")} {new Date(rg.createdAt).toLocaleDateString()}
            </span>
            <span>
              {t("common.updated")} {new Date(rg.updatedAt).toLocaleDateString()}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isActive ? (
              <Button variant="outline" className="flex-1" disabled>
                {t("resourceGroups.currentlyActive")}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="flex-1 border-primary/30 text-primary hover:bg-primary/10"
                onClick={handleSetActive}
                disabled={isSwitching}
              >
                {isSwitching ? t("resourceGroups.switching") : t("resourceGroups.setActive")}
              </Button>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToDetail}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {t("resourceGroups.contextMenu.viewDetails")}
              </TooltipContent>
            </Tooltip>

            {!rg.isDefault && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDelete}
                    disabled={isDeleting || isActive}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {isActive
                    ? "Cannot delete the active resource group"
                    : t("resourceGroups.delete")}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </ContextMenuTrigger>

      {/* Right-click context menu */}
      <ContextMenuContent className="w-48">
        <ContextMenuItem onSelect={handleSetActive} disabled={isActive} className="gap-2">
          <Check className="w-4 h-4" />
          {t("resourceGroups.contextMenu.setActive")}
        </ContextMenuItem>
        <ContextMenuItem onSelect={goToDetail} className="gap-2">
          <Eye className="w-4 h-4" />
          {t("resourceGroups.contextMenu.viewDetails")}
        </ContextMenuItem>
        <ContextMenuItem onSelect={goToEdit} className="gap-2">
          <Pencil className="w-4 h-4" />
          {t("resourceGroups.form.edit")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={handleDelete}
          disabled={rg.isDefault || isActive}
          className="gap-2 text-destructive focus:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
          {t("resourceGroups.contextMenu.delete")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
