import { useState } from "react"

import { Label, Textarea } from "@DataDack/common-ui"
import { Loader2, MessageSquare } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { SUPPORT_ROUTES } from "@/modules/support-tickets/support-tickets.constants"
import { useCreateSupportTicket } from "@/modules/support-tickets/support-tickets.hooks"

const NEEDS_MAX = 4000

interface CustomPlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The tier the account is on today — context the reader of the ticket needs. */
  currentPlanName: string
  projectsInUse: number
}

/**
 * Talking to us about a Custom plan.
 *
 * A custom tier is a conversation, not a checkout: the numbers are negotiated,
 * so the button cannot charge anything. It files a support ticket instead —
 * the channel that already has an owner, a queue and a thread the answer comes
 * back on. An email link would have none of those, and the customer would have
 * no way to see what happened to their request.
 *
 * Category `consultant` on purpose: this is a scheduled conversation about what
 * to buy, not an outage or a billing dispute, and that is the queue with the
 * people who can price it.
 */
export function CustomPlanDialog({
  open,
  onOpenChange,
  currentPlanName,
  projectsInUse,
}: Readonly<CustomPlanDialogProps>) {
  const navigate = useNavigate()
  const create = useCreateSupportTicket()

  const [needs, setNeeds] = useState("")
  const [projects, setProjects] = useState("")

  const close = () => {
    onOpenChange(false)
    setNeeds("")
    setProjects("")
  }

  const submit = () => {
    const trimmed = needs.trim()
    if (trimmed === "") return

    // The ticket carries the context the agent would otherwise have to ask
    // for: what they are on now, what they are using, what they asked for.
    const description = [
      "Custom Managed Apps plan request.",
      "",
      `Current plan: ${currentPlanName}`,
      `Projects in use: ${String(projectsInUse)}`,
      projects.trim() === "" ? null : `Projects needed: ${projects.trim()}`,
      "",
      "What they need:",
      trimmed,
    ]
      .filter((line) => line !== null)
      .join("\n")

    create.mutate(
      {
        subject: "Custom Managed Apps plan",
        description,
        category: "consultant",
        tags: { module: "managedapps", topic: "custom-plan" },
      },
      {
        onSuccess: (ticket) => {
          close()
          // Straight to the thread: the request is now a thing with a
          // state, and this is where the reply will arrive.
          void navigate(SUPPORT_ROUTES.detail(ticket.id))
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
        else onOpenChange(true)
      }}
    >
      <DialogContent className="glass-3 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="size-4 text-brand-gold" />
            Talk to us about a Custom plan
          </DialogTitle>
          <DialogDescription>
            Tell us what you need and we will price it. This opens a support ticket, so the reply
            lands in a thread you can follow — you are on{" "}
            <span className="text-foreground">{currentPlanName}</span> today.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="custom-plan-needs" className="text-[13px]">
              What do you need?
            </Label>
            <Textarea
              id="custom-plan-needs"
              value={needs}
              maxLength={NEEDS_MAX}
              rows={5}
              placeholder="Traffic you expect, custom domains, build minutes, regions, compliance — anything that makes the standard tiers a bad fit."
              onChange={(event) => {
                setNeeds(event.target.value)
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="custom-plan-projects" className="text-[13px]">
              Projects you expect to run <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="custom-plan-projects"
              value={projects}
              inputMode="numeric"
              placeholder="e.g. 25"
              className="sm:w-40"
              onChange={(event) => {
                setProjects(event.target.value)
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={close} disabled={create.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="gold"
            className="gap-2"
            disabled={needs.trim() === "" || create.isPending}
            onClick={submit}
          >
            {create.isPending && <Loader2 className="size-3.5 animate-spin" />}
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
