import { useEffect } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Save, Send, TriangleAlert } from "lucide-react"
import { useForm, useWatch, type UseFormReturn } from "react-hook-form"
import { toast } from "sonner"

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

import { useCreateChannel, useTestChannel } from "../monitoring.hooks"
import type { ChannelResponse, ChannelType } from "../monitoring.types"
import {
    buildCreatePayload,
    buildTestPayload,
    channelSchema,
    type ChannelFormValues,
} from "./channels.form"
import { CHANNEL_TYPES, SEVERITIES, SEVERITY_BADGE_CLASS, TYPE_META } from "./channels.meta"
import { FieldError, FieldLabel } from "./components/FormFields"
import { TestResultPanel } from "./components/TestResultPanel"
import { DiscordFields } from "./providers/discord/DiscordFields"
import { JiraFields } from "./providers/jira/JiraFields"
import { WebhookFields } from "./providers/webhook/WebhookFields"

const DEFAULT_VALUES: ChannelFormValues = {
    name: "",
    type: "discord",
    severity: "warning",
    jiraAuthMode: "oauth",
    jiraIssueType: "Task",
    jiraLabels: "datadack-monitoring",
}

const UNDELIVERED_MESSAGE = "Channel saved, but the test notification was not delivered"

function ProviderFields({
    type,
    form,
}: Readonly<{ type: ChannelType; form: UseFormReturn<ChannelFormValues> }>) {
    if (type === "discord") return <DiscordFields form={form} />
    if (type === "jira") return <JiraFields form={form} />
    return <WebhookFields form={form} />
}

/** Saved, but the notification bounced — the channel exists and is silently broken. */
function SavedButBrokenNotice({ name }: Readonly<{ name: string }>) {
    return (
        <div className="flex items-start gap-2 rounded-md border border-status-warning/30 bg-status-warning-bg p-3 text-[13px]">
            <TriangleAlert className="mt-px size-4 shrink-0 text-status-warning" />
            <p className="text-muted-foreground">
                Saved as <span className="font-mono text-foreground">{name}</span>, but the test
                notification never arrived — alarms sent there would reach nobody. Fix the details
                below and save again, then delete{" "}
                <span className="font-mono text-foreground">{name}</span> from the list.
            </p>
        </div>
    )
}

export function ChannelCreateDialog({
    open,
    onOpenChange,
    onCreated,
}: Readonly<{
    open: boolean
    onOpenChange: (open: boolean) => void
    /** Fired after a successful save so the caller can auto-select the new channel. */
    onCreated?: (channel: ChannelResponse) => void
}>) {
    const createChannel = useCreateChannel()
    const testChannel = useTestChannel()

    const form = useForm<ChannelFormValues>({
        resolver: zodResolver(channelSchema),
        defaultValues: DEFAULT_VALUES,
    })

    const {
        register,
        handleSubmit,
        setValue,
        setError,
        reset,
        formState: { errors },
    } = form

    const type = useWatch({ control: form.control, name: "type" })
    const severity = useWatch({ control: form.control, name: "severity" })

    // Mutation `reset` identities are stable (bound once on the observer), so
    // this only fires on the open -> reopen transition.
    const resetCreate = createChannel.reset
    const resetTest = testChannel.reset
    useEffect(() => {
        if (!open) return
        reset(DEFAULT_VALUES)
        resetCreate()
        resetTest()
    }, [open, reset, resetCreate, resetTest])

    const busy = createChannel.isPending || testChannel.isPending
    const created = createChannel.data
    // A save whose test bounced leaves a real, silently broken channel behind.
    const savedButBroken = created && !created.test.delivered ? created.channel : null
    // Both buttons produce a delivery result — show whichever ran last.
    const savedAt = created ? createChannel.submittedAt : 0
    const testedAt = testChannel.data ? testChannel.submittedAt : 0
    const result = testedAt > savedAt ? testChannel.data : created?.test

    const selectType = (next: ChannelType) => {
        setValue("type", next, { shouldValidate: false })
        resetTest()
        resetCreate()
    }

    const onSave = (values: ChannelFormValues) => {
        if (!values.name?.trim()) {
            setError("name", { type: "custom", message: "Name is required to save" })
            return
        }
        resetTest()
        createChannel.mutate(buildCreatePayload(values), {
            onSuccess: (res) => {
                onCreated?.(res.channel)
                if (res.test.delivered) {
                    reset(DEFAULT_VALUES)
                    onOpenChange(false)
                    return
                }
                // Stay open: a channel whose test bounced is exactly when the
                // user needs to see why.
                toast.warning(res.test.error ?? UNDELIVERED_MESSAGE)
            },
        })
    }

    const onTestOnly = (values: ChannelFormValues) => {
        testChannel.mutate(buildTestPayload(values), {
            onSuccess: (testResult) => {
                if (testResult.delivered) {
                    toast.success("Test notification delivered")
                } else {
                    toast.error(testResult.error ?? "Test notification was not delivered")
                }
            },
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-3 sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add channel</DialogTitle>
                    <DialogDescription>
                        Add one for each target you want — repeat for multiple webhooks or Discord
                        channels. Saving fires a real test notification.
                    </DialogDescription>
                </DialogHeader>

                {/*
                  stopPropagation is load-bearing. This dialog is opened from the
                  alarm form's Notifications section, so even though Radix portals
                  the content out to <body>, React still bubbles the submit event
                  up the REACT tree — straight into the alarm form's onSubmit.
                  Without this, "Save channel" also created the alarm.
                */}
                <form
                    onSubmit={(e) => {
                        e.stopPropagation()
                        void handleSubmit(onSave)(e)
                    }}
                    className="space-y-4"
                >
                    <div className="-mx-1 max-h-[55vh] space-y-5 overflow-y-auto px-1">
                        <div className="space-y-1.5">
                            <FieldLabel>Channel type</FieldLabel>
                            <div className="grid grid-cols-3 gap-2">
                                {CHANNEL_TYPES.map((channelType) => {
                                    const meta = TYPE_META[channelType]
                                    const TypeIcon = meta.icon
                                    const active = type === channelType
                                    return (
                                        <Button
                                            key={channelType}
                                            type="button"
                                            variant="outline"
                                            className={cn(
                                                "h-9 gap-1 px-2 font-mono text-[12px] sm:gap-1.5 sm:text-[13px]",
                                                active && meta.activeClass
                                            )}
                                            aria-pressed={active}
                                            onClick={() => {
                                                selectType(channelType)
                                            }}
                                        >
                                            <TypeIcon className="size-3.5" />
                                            {meta.label}
                                        </Button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <FieldLabel>Name</FieldLabel>
                            <Input
                                {...register("name")}
                                placeholder="e.g. #ops-alerts"
                                autoComplete="off"
                            />
                            <FieldError message={errors.name?.message} />
                        </div>

                        <ProviderFields type={type} form={form} />

                        <div className="space-y-1.5">
                            <FieldLabel>Minimum severity</FieldLabel>
                            <Select
                                value={severity}
                                onValueChange={(value) => {
                                    setValue("severity", value as ChannelFormValues["severity"], {
                                        shouldValidate: true,
                                    })
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SEVERITIES.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            <span
                                                className={cn(
                                                    "rounded border px-1.5 py-0.5 font-mono text-[11px]",
                                                    SEVERITY_BADGE_CLASS[option]
                                                )}
                                            >
                                                {option}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground">
                                Anything less serious than this is not sent here.
                            </p>
                        </div>

                        {savedButBroken && <SavedButBrokenNotice name={savedButBroken.name} />}
                        {result && <TestResultPanel result={result} />}
                    </div>

                    <DialogFooter className="border-t border-border/60 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-1.5"
                            disabled={busy}
                            onClick={() => void handleSubmit(onTestOnly)()}
                        >
                            {testChannel.isPending ? (
                                <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                                <Send className="size-3.5" />
                            )}
                            Test only
                        </Button>
                        <Button type="submit" className="gap-1.5" disabled={busy}>
                            {createChannel.isPending ? (
                                <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                                <Save className="size-3.5" />
                            )}
                            {savedButBroken ? "Save again" : "Save channel"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
