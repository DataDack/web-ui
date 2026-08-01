// Create / edit an alarm — one page, all of it visible.
//
// The old flow asked for a metric identity (namespace, metric name, free-text
// dimensions) and nobody could work out how to alarm on a load balancer. This
// asks the four questions people actually have — which resource, which signal,
// which rule, who gets told — top to bottom, with a live summary and a readiness
// checklist in the rail.
//
// Deliberately NOT a wizard. Every section is on screen from the first render;
// sections whose prerequisite is unanswered show a one-line note instead of
// hiding, so the shape of the whole task is visible immediately. The checklist
// supplies the "am I done?" answer a stepper would have, and each of its rows
// scrolls to its section instead of advancing a hidden cursor.

import { useEffect, useMemo, useRef, useState, type RefObject } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, BellPlus } from "lucide-react"
import { useForm } from "react-hook-form"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { PageHeader, Section } from "@/components/console"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useScreen } from "@/services/api/screen"

import { ConditionSection } from "./ConditionSection"
import { NotifySection } from "./NotifySection"
import {
    DEFAULT_VALUES,
    TARGET_TYPE_VALUES,
    alarmFormSchema,
    alarmToFormValues,
    buildPayloads,
    isTargetReady,
    numeric,
    parseDimensions,
    readiness,
    submitBlocker,
    type FormValues,
    type PeriodSeconds,
    type SectionId,
} from "./schema"
import { SignalSection } from "./SignalSection"
import { SummaryRail } from "./SummaryRail"
import { TargetSection } from "./TargetSection"
import { useTargetNames } from "./useAlarmTargets"
import { MONITORING_ROUTES } from "../../monitoring.constants"
import { useAlarm, useCreateAlarm, useUpdateAlarm } from "../../monitoring.hooks"
import { OPERATOR_PHRASES, TREAT_MISSING_LABELS, periodLabel } from "../../monitoring.meta"
import {
    TARGET_TYPE_META,
    describeMetric,
    dimensionsFor,
    namespaceFor,
    suggestAlarmName,
    type AlarmTargetType,
} from "../../monitoring.targets"
import type { CreateAlarmRequest, MetricDescriptor } from "../../monitoring.types"

const LABEL_CLASS = "text-xs font-semibold uppercase tracking-wide text-muted-foreground"
const ERROR_CLASS = "text-[11px] text-destructive"

/**
 * Deep-link entry: the "Create alarm" button on a load balancer or instance page
 * arrives with its resource already chosen, so section 1 is answered on arrival.
 */
function initialValues(params: URLSearchParams): FormValues {
    const rawType = params.get("target_type") ?? ""
    const targetId = params.get("target_id") ?? ""
    const known = TARGET_TYPE_VALUES.find((value) => value === rawType)
    if (!known) return DEFAULT_VALUES
    return {
        ...DEFAULT_VALUES,
        targetType: known,
        targetIds: targetId ? [targetId] : [],
    }
}

/** The rule as one sentence, read from live (possibly mid-typing) form values. */
function ruleSentence(values: FormValues, metricLabel: string, unit: string): string {
    const threshold = numeric(values.threshold)
    const needed = numeric(values.datapointsToAlarm)
    const periods = numeric(values.evaluationPeriods)
    const thresholdText = threshold === null ? "…" : String(threshold)
    const suffix = unit ? ` ${unit}` : ""
    return (
        `Alerts when the ${values.statistic} of ${metricLabel} is ` +
        `${OPERATOR_PHRASES[values.operator]} ${thresholdText}${suffix} for ` +
        `${needed === null ? "…" : String(needed)} of the last ` +
        `${periods === null ? "…" : String(periods)} periods of ` +
        `${periodLabel(values.periodSeconds)}, with gaps ` +
        `${TREAT_MISSING_LABELS[values.treatMissingData]}.`
    )
}

function joinNames(names: string[]): string {
    if (names.length <= 2) return names.join(" and ")
    return `${names.slice(0, 2).join(", ")} and ${String(names.length - 2)} more`
}

export function AlarmFormPage() {
    useScreen("monitoring.alarm-form")
    const navigate = useNavigate()
    const { id } = useParams<{ id?: string }>()
    const [searchParams] = useSearchParams()
    const isEdit = Boolean(id)

    const alarmQuery = useAlarm(id ?? "")
    const createAlarm = useCreateAlarm()
    const updateAlarm = useUpdateAlarm(id ?? "")
    const resourceNames = useTargetNames()
    const [creating, setCreating] = useState(false)

    const defaults = useMemo(() => initialValues(searchParams), [searchParams])
    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors, dirtyFields },
    } = useForm<FormValues>({
        resolver: zodResolver(alarmFormSchema),
        defaultValues: defaults,
    })

    // Edit mode seeds itself once, the first time the alarm arrives. Seeding on
    // every refetch would fight the user's edits (the query polls every 30s).
    const seededRef = useRef(false)
    const alarm = alarmQuery.data
    useEffect(() => {
        if (!isEdit || seededRef.current || !alarm) return
        seededRef.current = true
        reset(alarmToFormValues(alarm))
    }, [isEdit, alarm, reset])

    const values = watch()

    // A deep link carries the resource's name so the summary and the suggested
    // alarm name read correctly before the resource lists have loaded.
    const deepLinkId = searchParams.get("target_id") ?? ""
    const deepLinkName = searchParams.get("target_name") ?? ""
    const names = useMemo(() => {
        if (!deepLinkId || !deepLinkName) return resourceNames
        return { [deepLinkId]: deepLinkName, ...resourceNames }
    }, [resourceNames, deepLinkId, deepLinkName])

    const targetType = values.targetType
    const meta = TARGET_TYPE_META[targetType]
    const namespace = namespaceFor(targetType, values.customNamespace)
    const firstTargetId = values.targetIds.length > 0 ? values.targetIds[0] : ""
    const dimensions = useMemo(
        () =>
            dimensionsFor(
                targetType,
                firstTargetId,
                parseDimensions(values.customDimensions) ?? {}
            ),
        [targetType, firstTargetId, values.customDimensions]
    )

    const descriptor = describeMetric(targetType, values.metric)
    const hasTarget = isTargetReady(values)
    const hasSignal = hasTarget && values.metric.trim().length > 0
    const metricLabel = values.metric ? descriptor.label : ""

    // Record lookups are typed as total, so a miss is resolved explicitly rather
    // than with `??` (which the type says can never fire).
    const resolveName = (targetId: string): string => {
        if (Object.hasOwn(names, targetId)) return names[targetId]
        return targetId.slice(0, 8)
    }

    const rows = readiness(values)
    const blocker = submitBlocker(values)

    // One ref per section so the checklist can scroll to it. Stable refs (rather
    // than a callback map) keep the form from re-attaching them on every keypress.
    const targetRef = useRef<HTMLDivElement>(null)
    const signalRef = useRef<HTMLDivElement>(null)
    const conditionRef = useRef<HTMLDivElement>(null)
    const notifyRef = useRef<HTMLDivElement>(null)
    const nameRef = useRef<HTMLDivElement>(null)
    const sectionRefs: Record<SectionId, RefObject<HTMLDivElement | null>> = {
        target: targetRef,
        signal: signalRef,
        condition: conditionRef,
        notify: notifyRef,
        name: nameRef,
    }

    if (isEdit && alarmQuery.isLoading) {
        return (
            <div className="space-y-5">
                <Skeleton className="h-24" />
                <Skeleton className="h-96" />
            </div>
        )
    }

    const jumpTo = (sectionId: SectionId) => {
        const node = sectionRefs[sectionId].current
        if (!node) return
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        node.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
    }

    /**
     * Keep the name in step with the target and signal until the user types their
     * own. With several resources the resource name is left out — each payload is
     * suffixed with its own resource at build time.
     */
    const applySuggestedName = (
        metric: string,
        targetIds: string[],
        operator: FormValues["operator"]
    ) => {
        if (isEdit || dirtyFields.name === true || !metric) return
        const single = targetIds.length === 1 ? resolveName(targetIds[0]) : ""
        setValue("name", suggestAlarmName(single, metric, operator), {
            shouldDirty: false,
        })
    }

    const handleTypeChange = (next: AlarmTargetType) => {
        setValue("targetType", next)
        // Resources and signals are both type-specific — keeping either would
        // address a series that does not exist.
        setValue("targetIds", [])
        setValue("metric", "")
    }

    const handleTargetIdsChange = (ids: string[]) => {
        setValue("targetIds", ids)
        applySuggestedName(values.metric, ids, values.operator)
    }

    const handleMetricSelect = (selected: MetricDescriptor) => {
        setValue("metric", selected.metric)
        setValue("statistic", selected.statistic)
        setValue("operator", selected.operator)
        setValue("threshold", selected.threshold)
        applySuggestedName(selected.metric, values.targetIds, selected.operator)
    }

    const createAll = async (payloads: CreateAlarmRequest[]) => {
        setCreating(true)
        const results = await Promise.allSettled(
            payloads.map((payload) => createAlarm.mutateAsync(payload))
        )
        setCreating(false)
        const created = results.flatMap((result) =>
            result.status === "fulfilled" ? [result.value] : []
        )
        const failed = results.length - created.length
        // Never report success for the ones that failed — each failure already
        // toasted its own reason; this says how much of the batch survived.
        if (failed > 0 && created.length > 0) {
            toast.error(
                `${String(failed)} of ${String(results.length)} alarms could not be created. The other ${String(created.length)} were saved.`
            )
        }
        if (created.length === 0) return
        if (created.length === 1) {
            void navigate(MONITORING_ROUTES.alarm(created[0].id))
            return
        }
        void navigate(MONITORING_ROUTES.alarms)
    }

    const onValid = (parsed: FormValues) => {
        const payloads = buildPayloads(parsed, names)
        if (isEdit && id) {
            updateAlarm.mutate(payloads[0], {
                onSuccess: () => {
                    void navigate(MONITORING_ROUTES.alarm(id))
                },
            })
            return
        }
        void createAll(payloads)
    }

    const targetLine = (() => {
        if (targetType === "custom") {
            return values.customNamespace.trim() || "a custom metric namespace"
        }
        if (values.targetIds.length === 0) return `No ${meta.plural} chosen yet`
        return joinNames(values.targetIds.map(resolveName))
    })()

    return (
        // The route hides the service sidebar, so this page is full-bleed. Cap it
        // at the console's own content width (same max-w-400 AppShell uses for its
        // centred branch) — without a cap the two columns sprawl on an ultrawide
        // and the condition sentence wraps past what the eye can track.
        <div className="mx-auto w-full max-w-400 space-y-5">
            <PageHeader
                icon={BellPlus}
                breadcrumbs={[
                    { label: "Monitoring", to: MONITORING_ROUTES.root },
                    { label: "Alarms", to: MONITORING_ROUTES.alarms },
                    { label: isEdit ? "Edit" : "Create" },
                ]}
                title={isEdit ? "Edit alarm" : "Create alarm"}
                description="Pick what to watch, which signal, and when it should page you."
                actions={
                    <Button
                        variant="ghost"
                        className="gap-2"
                        onClick={() => void navigate(MONITORING_ROUTES.alarms)}
                    >
                        <ArrowLeft className="size-4" />
                        Alarms
                    </Button>
                }
            />

            {/*
              Only submit for THIS form. The inline channel dialog renders inside
              this subtree, and React bubbles a portaled form's submit event up the
              React tree — so an unguarded handler treated "Save channel" as
              "Create alarm". The dialog also stops propagation; this is the
              backstop that keeps any future nested form from doing it again.
            */}
            <form
                onSubmit={(event) => {
                    if (event.target !== event.currentTarget) return
                    void handleSubmit(onValid)(event)
                }}
            >
                <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="space-y-5">
                        <div ref={targetRef}>
                            <Section
                                variant="panel"
                                title="What to watch"
                                description={
                                    isEdit
                                        ? "The resource this alarm watches."
                                        : "One alarm per resource — pick as many as share the same rule."
                                }
                            >
                                <TargetSection
                                    targetType={targetType}
                                    targetIds={values.targetIds}
                                    customNamespace={values.customNamespace}
                                    customDimensions={values.customDimensions}
                                    singleSelect={isEdit}
                                    errors={{
                                        targetIds: errors.targetIds?.message,
                                        customNamespace: errors.customNamespace?.message,
                                        customDimensions: errors.customDimensions?.message,
                                    }}
                                    onTypeChange={handleTypeChange}
                                    onTargetIdsChange={handleTargetIdsChange}
                                    onCustomNamespaceChange={(value) => {
                                        setValue("customNamespace", value)
                                    }}
                                    onCustomDimensionsChange={(value) => {
                                        setValue("customDimensions", value)
                                    }}
                                />
                            </Section>
                        </div>

                        <div ref={signalRef}>
                            <Section
                                variant="panel"
                                title="Signal"
                                description="What this resource reports. Picking one sets a sensible starting rule."
                            >
                                <SignalSection
                                    targetType={targetType}
                                    metric={values.metric}
                                    namespace={namespace}
                                    dimensions={dimensions}
                                    hasTarget={hasTarget}
                                    targetLabel={firstTargetId ? resolveName(firstTargetId) : ""}
                                    error={errors.metric?.message}
                                    onMetricChange={(value) => {
                                        setValue("metric", value)
                                    }}
                                    onMetricSelect={handleMetricSelect}
                                />
                            </Section>
                        </div>

                        <div ref={conditionRef}>
                            <Section
                                variant="panel"
                                title="Condition"
                                description="Read it as a sentence — the chart below replays it over the last day."
                            >
                                <ConditionSection
                                    namespace={namespace}
                                    dimensions={dimensions}
                                    metric={values.metric}
                                    metricLabel={metricLabel}
                                    unit={descriptor.unit}
                                    hasSignal={hasSignal}
                                    statistic={values.statistic}
                                    periodSeconds={values.periodSeconds}
                                    operator={values.operator}
                                    treatMissingData={values.treatMissingData}
                                    threshold={values.threshold}
                                    datapointsToAlarm={values.datapointsToAlarm}
                                    evaluationPeriods={values.evaluationPeriods}
                                    register={register}
                                    errors={{
                                        threshold: errors.threshold?.message,
                                        datapointsToAlarm: errors.datapointsToAlarm?.message,
                                        evaluationPeriods: errors.evaluationPeriods?.message,
                                    }}
                                    onStatisticChange={(value) => {
                                        setValue("statistic", value)
                                    }}
                                    onOperatorChange={(value) => {
                                        setValue("operator", value)
                                    }}
                                    onPeriodChange={(value: PeriodSeconds) => {
                                        setValue("periodSeconds", value)
                                    }}
                                    onTreatMissingChange={(value) => {
                                        setValue("treatMissingData", value)
                                    }}
                                />
                            </Section>
                        </div>

                        <div ref={notifyRef}>
                            <Section
                                variant="panel"
                                title="Notifications"
                                description="Who hears about it, and whether they also hear the recovery."
                            >
                                <NotifySection
                                    severity={values.severity}
                                    channels={values.channels}
                                    onSeverityChange={(value) => {
                                        setValue("severity", value)
                                    }}
                                    onChannelsChange={(next) => {
                                        setValue("channels", next)
                                    }}
                                />
                            </Section>
                        </div>

                        <div ref={nameRef}>
                            <Section
                                variant="panel"
                                title="Name"
                                description="Suggested from the resource and signal above — change it if you like."
                            >
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label className={LABEL_CLASS}>Alarm name</Label>
                                        <Input
                                            {...register("name")}
                                            placeholder="e.g. lb-prod-web-error-rate-5xx-high"
                                            className="font-mono text-[13px]"
                                            autoComplete="off"
                                        />
                                        {values.targetIds.length > 1 && (
                                            <p className="text-[11px] text-muted-foreground">
                                                Each alarm gets its resource name added, so the{" "}
                                                {values.targetIds.length} names stay distinct.
                                            </p>
                                        )}
                                        {errors.name?.message && (
                                            <p className={ERROR_CLASS}>{errors.name.message}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className={LABEL_CLASS}>
                                            Description (optional)
                                        </Label>
                                        <Textarea
                                            {...register("description")}
                                            placeholder="What should someone do when this fires?"
                                            className="min-h-16 text-[13px]"
                                        />
                                        {errors.description?.message && (
                                            <p className={ERROR_CLASS}>
                                                {errors.description.message}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </Section>
                        </div>
                    </div>

                    <SummaryRail
                        targetLine={targetLine}
                        metricLine={
                            metricLabel
                                ? `${metricLabel} · ${values.statistic}`
                                : "No signal chosen yet"
                        }
                        conditionLine={ruleSentence(
                            values,
                            metricLabel || "the signal",
                            descriptor.unit
                        )}
                        severity={values.severity}
                        channelCount={values.channels.length}
                        rows={rows}
                        blocker={blocker}
                        isSubmitting={creating || updateAlarm.isPending}
                        submitLabel={isEdit ? "Save changes" : "Create alarm"}
                        onJump={jumpTo}
                        onCancel={() => void navigate(MONITORING_ROUTES.alarms)}
                    />
                </div>
            </form>
        </div>
    )
}
