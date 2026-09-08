import { useState } from "react"

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@datadack/common-ui"
import { useNavigate } from "react-router-dom"

import { routeTablePath, useRouteTableActions } from "../../route-tables"
import { useVPCs } from "../../vpc.hooks"

export function CreateRouteTableDialog({
  open,
  onOpenChange,
}: Readonly<{ open: boolean; onOpenChange: (open: boolean) => void }>) {
  const [name, setName] = useState("")
  const [vpcID, setVpcID] = useState("")
  const { data: vpcs = [], isLoading, isError, refetch } = useVPCs()
  const { create } = useRouteTableActions()
  const navigate = useNavigate()
  const close = (next: boolean) => {
    if (!next && !create.isPending) {
      setName("")
      setVpcID("")
      create.reset()
    }
    if (!create.isPending) onOpenChange(next)
  }
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create route table</DialogTitle>
          <DialogDescription>
            Group routes for a VPC and choose the subnets that use them.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault()
            create.mutate(
              { name: name.trim(), vpc_id: vpcID },
              {
                onSuccess: (table) => {
                  onOpenChange(false)
                  void navigate(routeTablePath(table.id))
                },
              },
            )
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="route-table-name">Name</Label>
            <Input
              id="route-table-name"
              autoFocus
              required
              maxLength={128}
              placeholder="private-routes"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="route-table-vpc">VPC</Label>
            <Select value={vpcID} onValueChange={setVpcID} disabled={isLoading || isError}>
              <SelectTrigger id="route-table-vpc">
                <SelectValue placeholder={isLoading ? "Loading VPCs…" : "Select a VPC"} />
              </SelectTrigger>
              <SelectContent>
                {vpcs
                  .filter((vpc) => vpc.status !== "deleting")
                  .map((vpc) => (
                    <SelectItem key={vpc.id} value={vpc.id}>
                      {vpc.name} · {vpc.cidr}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {isError && (
              <p role="alert" className="text-sm text-destructive">
                VPCs could not be loaded.{" "}
                <button type="button" className="underline" onClick={() => void refetch()}>
                  Try again
                </button>
              </p>
            )}
            {!isLoading && !isError && vpcs.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Create a VPC before adding a route table.
              </p>
            )}
          </div>
          <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            A local route for the VPC’s address range is included automatically. The first table
            becomes the main table for subnets without an explicit association.
          </div>
          {create.isError && (
            <p role="alert" className="text-sm text-destructive">
              The route table could not be created. Check the selected VPC and try again.
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={create.isPending}
              onClick={() => {
                close(false)
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gold"
              loading={create.isPending}
              disabled={!name.trim() || !vpcID || create.isPending}
            >
              Create route table
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
