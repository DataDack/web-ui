import { useState } from "react"

import { Label } from "@DataDack/common-ui"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@datadack/common-ui"
import { useInstances } from "@/modules/vms/vms.hooks"

import { useAttachDisk } from "../disks.hooks"
import type { Disk } from "../disks.types"

interface Props {
  disk: Disk | null
  onOpenChange: (open: boolean) => void
}

export function AttachDiskDialog({ disk, onOpenChange }: Readonly<Props>) {
  const { t } = useTranslation()
  const { data: instances = [] } = useInstances()
  const { mutate: attach, isPending } = useAttachDisk()
  const [instanceId, setInstanceId] = useState("")

  // Only running/stopped instances in the same zone can mount the disk
  const candidates = instances.filter(
    (i) => i.zone === disk?.zone && (i.status === "running" || i.status === "stopped"),
  )

  const close = (open: boolean) => {
    if (!open) setInstanceId("")
    onOpenChange(open)
  }

  return (
    <Dialog open={!!disk} onOpenChange={close}>
      <DialogContent className="sm:max-w-md glass-3">
        <DialogHeader>
          <DialogTitle>{t("disks.attachForm.title")}</DialogTitle>
          <DialogDescription>
            {t("disks.attachForm.description", { name: disk?.name ?? "" })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            {t("disks.attachForm.instance")}
          </Label>
          <Select value={instanceId} onValueChange={setInstanceId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("disks.attachForm.instancePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {candidates.length === 0 ? (
                <div className="px-2 py-3 text-sm text-muted-foreground">
                  {t("disks.attachForm.noInstances", { zone: disk?.zone ?? "" })}
                </div>
              ) : (
                candidates.map((instance) => (
                  <SelectItem key={instance.id} value={instance.id}>
                    {instance.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              close(false)
            }}
            disabled={isPending}
          >
            {t("console.confirm.cancel")}
          </Button>
          <Button
            type="button"
            disabled={!instanceId || isPending}
            className="gap-2"
            onClick={() => {
              if (!disk) return
              attach(
                { id: disk.id, instanceId },
                {
                  onSuccess: () => {
                    close(false)
                  },
                },
              )
            }}
          >
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            {t("disks.actions.attach")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
