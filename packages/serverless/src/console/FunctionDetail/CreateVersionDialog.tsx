import { useEffect, useId, useState } from "react"

import { toast } from "sonner"

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
  css,
  cx,
  glass3,
} from "@datadack/common-ui"

import { errorMessage } from "./errorMessage"
import type { FunctionDetailLabels } from "./labels"
import { useCreateVersion } from "../../data/queries"

const content = css`
  max-width: 26rem;
`

const field = css`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export interface CreateVersionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  functionName: string
  scope?: string
  labels: FunctionDetailLabels
  /** The number this will create — the current working version plus one. */
  nextVersion: string
}

/**
 * Create a version from whatever is deployed right now.
 *
 * The dialog carries no version content of its own: deploys have been landing
 * on the working version all along, so "create a version" only decides that the
 * current state is worth keeping under a number. The description is the one
 * thing the user can add, and it is what the version list has to show later to
 * distinguish two numbers from each other.
 */
export function CreateVersionDialog({
  open,
  onOpenChange,
  functionName,
  scope,
  labels,
  nextVersion,
}: Readonly<CreateVersionDialogProps>) {
  const createVersion = useCreateVersion(functionName, scope)
  const fieldId = useId()
  const [description, setDescription] = useState("")

  // Reseed on open so a reused dialog never carries the last attempt's note.
  useEffect(() => {
    if (!open) return
    setDescription("")
  }, [open])

  const submit = () => {
    const trimmed = description.trim()
    createVersion.mutate(trimmed === "" ? undefined : { description: trimmed }, {
      onSuccess: (fn) => {
        toast.success(labels.versions.created(fn.version?.version ?? nextVersion))
        onOpenChange(false)
      },
      onError: (error) => {
        toast.error(errorMessage(error, labels.versions.createError))
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cx(glass3, content)}>
        <DialogHeader>
          <DialogTitle>{labels.versions.createTitle}</DialogTitle>
          <DialogDescription>{labels.versions.createDescription(nextVersion)}</DialogDescription>
        </DialogHeader>

        <div className={field}>
          <Label htmlFor={`${fieldId}-description`}>
            {labels.versions.createDescriptionLabel}
          </Label>
          <Input
            id={`${fieldId}-description`}
            value={description}
            placeholder={labels.versions.createDescriptionPlaceholder}
            onChange={(event) => {
              setDescription(event.target.value)
            }}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {labels.versions.cancel}
          </Button>
          <Button onClick={submit} disabled={createVersion.isPending}>
            {labels.versions.createConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
