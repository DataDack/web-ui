import { useState } from "react"

import { Box, HardDrive } from "lucide-react"
import { motion } from "motion/react"
import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@datadack/common-ui"
import { cn } from "@/lib/utils"
import type { ImageCatalogFamily } from "@/modules/catalog/catalog.types"
import { OSIcon } from "@/modules/catalog/os-icons"

import { FieldError, FieldLabel } from "./wizard.shared"
import type { FormValues } from "./wizard.types"

/** Flatten the image catalog so a version id resolves to its family + version. */
function findVersion(families: ImageCatalogFamily[], versionId: string) {
  for (const family of families) {
    const version = family.versions.find((v) => v.id === versionId)
    if (version) return { family, version }
  }
  return undefined
}

export function OSStep({
  form,
  families,
}: Readonly<{
  form: UseFormReturn<FormValues>
  families: ImageCatalogFamily[]
}>) {
  const { t } = useTranslation()
  const selectedImage = form.watch("image_id")
  const selectedFamilyFromImage = findVersion(families, selectedImage)?.family
  const [familyId, setFamilyId] = useState<string>("")
  const openFamily =
    families.find((f) => f.id === familyId) ?? selectedFamilyFromImage ?? families.at(0)

  return (
    <div className="space-y-4">
      {families.length === 0 ? (
        <p className="text-[12px] text-muted-foreground glass-1 px-3.5 py-3">
          {t("vms.wizard.noImages")}
        </p>
      ) : (
        <Tabs defaultValue="quick-select" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-background/50 border border-border-glass h-12 p-1">
            <TabsTrigger
              value="quick-select"
              className="text-[13px] h-full rounded-md data-[state=active]:bg-accent/50"
            >
              Quick Select
            </TabsTrigger>
            <TabsTrigger
              value="marketplace"
              className="text-[13px] h-full rounded-md data-[state=active]:bg-accent/50"
            >
              Marketplace
            </TabsTrigger>
            <TabsTrigger
              value="my-images"
              className="text-[13px] h-full rounded-md data-[state=active]:bg-accent/50"
            >
              My Images
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="quick-select"
            className="animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {families.map((family) => {
                const active = openFamily?.id === family.id
                return (
                  <motion.button
                    key={family.id}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setFamilyId(family.id)
                      const next =
                        family.versions.find((v) => v.is_default) ?? family.versions.at(0)
                      if (next)
                        form.setValue("image_id", next.id, {
                          shouldValidate: true,
                        })
                    }}
                    className={cn(
                      "glass-1 flex flex-col items-center justify-center gap-3 px-3 py-4 transition-colors rounded-lg",
                      active
                        ? "gradient-ring bg-accent/20"
                        : "hover:bg-accent/30 border-border-glass",
                    )}
                  >
                    <OSIcon osFamily={family.name} iconUrl={family.icon_url} className="size-8" />
                    <span className="text-[12px] font-medium text-foreground text-center line-clamp-1">
                      {family.display_name}
                    </span>
                  </motion.button>
                )
              })}
            </div>

            {openFamily && openFamily.versions.length > 0 && (
              <div className="space-y-3 pt-2">
                <FieldLabel>Available AMIs</FieldLabel>
                <div className="grid sm:grid-cols-2 gap-3">
                  <TooltipProvider>
                    {openFamily.versions.map((version) => {
                      const active = selectedImage === version.id
                      return (
                        <Tooltip key={version.id} delayDuration={300}>
                          <TooltipTrigger asChild>
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                form.setValue("image_id", version.id, { shouldValidate: true })
                              }}
                              className={cn(
                                "flex items-center justify-between text-left px-4 py-3 rounded-lg border transition-all",
                                active
                                  ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary),0.2)]"
                                  : "border-border-glass bg-background/50 hover:bg-accent/30",
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "size-4 rounded-full border grid place-items-center shrink-0",
                                    active
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-muted-foreground/30",
                                  )}
                                >
                                  {active && (
                                    <div className="size-1.5 rounded-full bg-background" />
                                  )}
                                </div>
                                <div>
                                  <span className="block text-[13px] font-medium text-foreground">
                                    {version.name || version.os_version}
                                  </span>
                                  <span className="block text-[11px] text-muted-foreground mt-0.5">
                                    {version.architecture}
                                  </span>
                                </div>
                              </div>
                              {version.is_default && (
                                <span className="text-[10px] uppercase tracking-wider font-semibold bg-accent/50 text-muted-foreground px-2 py-0.5 rounded-full">
                                  Default
                                </span>
                              )}
                            </motion.button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs space-y-1 p-3">
                            <p className="font-semibold">
                              {version.name || `${openFamily.display_name} ${version.os_version}`}
                            </p>
                            {(version.architecture || version.min_disk_gb > 0) && (
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 text-muted-foreground">
                                {version.architecture && (
                                  <>
                                    <span>Architecture:</span>
                                    <span className="font-medium text-foreground">
                                      {version.architecture}
                                    </span>
                                  </>
                                )}
                                {version.min_disk_gb > 0 && (
                                  <>
                                    <span>Min Disk:</span>
                                    <span className="font-medium text-foreground">
                                      {version.min_disk_gb} GB
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </TooltipProvider>
                </div>
                <FieldError message={form.formState.errors.image_id?.message} />
              </div>
            )}
          </TabsContent>

          <TabsContent
            value="marketplace"
            className="glass-1 border-border-glass rounded-lg p-8 text-center space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <Box className="size-8 mx-auto text-muted-foreground/50" />
            <div>
              <p className="text-[14px] font-medium text-foreground">Marketplace Apps</p>
              <p className="text-[13px] text-muted-foreground mt-1 max-w-sm mx-auto">
                Pre-configured 1-click applications are currently unavailable. Coming soon!
              </p>
            </div>
          </TabsContent>

          <TabsContent
            value="my-images"
            className="glass-1 border-border-glass rounded-lg p-8 text-center space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <HardDrive className="size-8 mx-auto text-muted-foreground/50" />
            <div>
              <p className="text-[14px] font-medium text-foreground">Custom Images & Snapshots</p>
              <p className="text-[13px] text-muted-foreground mt-1 max-w-sm mx-auto">
                Your saved AMIs and volume snapshots will appear here. Coming soon!
              </p>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
