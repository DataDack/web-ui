// The resource lists the alarm form picks from, normalized to one row shape.
//
// Hooks cannot be conditional, so all three services are queried on every render
// and the selected type picks a list. That is also what makes the target-type
// cards able to show a live count each — the page knows how many load balancers,
// instances and disks the account has before the user picks a type.

import { useMemo } from "react"

import { useDisks } from "@/modules/disks/disks.hooks"
import { useLoadBalancers } from "@/modules/load-balancers/load-balancers.hooks"
import { useInstances } from "@/modules/vms/vms.hooks"

import type { AlarmTargetType } from "../../monitoring.targets"
import type { AlarmTarget } from "../../monitoring.types"

function detailLine(parts: (string | false | null | undefined)[]): string {
    return parts.filter((part): part is string => Boolean(part)).join(" · ")
}

export function useAlarmTargets(type: AlarmTargetType): {
    targets: AlarmTarget[]
    isLoading: boolean
} {
    const loadBalancers = useLoadBalancers()
    const instances = useInstances()
    const disks = useDisks()

    const targets = useMemo<AlarmTarget[]>(() => {
        if (type === "loadbalancer") {
            return (loadBalancers.data ?? []).map((lb) => ({
                id: lb.id,
                name: lb.name,
                status: lb.status,
                detail: detailLine([lb.public_ip, lb.private_ip, lb.type]),
            }))
        }
        if (type === "instance") {
            return (instances.data ?? []).map((instance) => ({
                id: instance.id,
                name: instance.name,
                status: instance.status,
                detail: detailLine([
                    instance.private_ip,
                    instance.region,
                    `${String(instance.cpu_count)} vCPU`,
                ]),
            }))
        }
        if (type === "disk") {
            return (disks.data ?? []).map((disk) => ({
                id: disk.id,
                name: disk.name,
                status: disk.status,
                detail: detailLine([
                    `${String(disk.size_gb)} GiB`,
                    disk.disk_type,
                    disk.instance_id ? "attached" : "not attached",
                ]),
            }))
        }
        return []
    }, [type, loadBalancers.data, instances.data, disks.data])

    const loadingByType: Record<AlarmTargetType, boolean> = {
        loadbalancer: loadBalancers.isLoading,
        instance: instances.isLoading,
        disk: disks.isLoading,
        custom: false,
    }

    return { targets, isLoading: loadingByType[type] }
}

/** How many resources exist per target type — the count on each type card. */
export function useTargetCounts(): Record<AlarmTargetType, number> {
    const loadBalancers = useLoadBalancers()
    const instances = useInstances()
    const disks = useDisks()

    return useMemo(
        () => ({
            loadbalancer: (loadBalancers.data ?? []).length,
            instance: (instances.data ?? []).length,
            disk: (disks.data ?? []).length,
            custom: 0,
        }),
        [loadBalancers.data, instances.data, disks.data]
    )
}

/**
 * id -> name across every target type. The page uses it to suffix one alarm name
 * per resource when several are selected, and to name resources in the summary.
 */
export function useTargetNames(): Record<string, string> {
    const loadBalancers = useLoadBalancers()
    const instances = useInstances()
    const disks = useDisks()

    return useMemo(() => {
        const names: Record<string, string> = {}
        for (const lb of loadBalancers.data ?? []) names[lb.id] = lb.name
        for (const instance of instances.data ?? []) names[instance.id] = instance.name
        for (const disk of disks.data ?? []) names[disk.id] = disk.name
        return names
    }, [loadBalancers.data, instances.data, disks.data])
}
