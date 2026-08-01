import { type ReactNode, useState } from "react"

import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import type { FieldValues, Path, UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { KeyValueItem } from "../KeyValueGrid"
import { WizardReviewStep } from "./WizardReviewStep"
import { WizardStepper } from "./WizardStepper"
import { DUR, EASE } from "../motion/motion-config"

export interface WizardStep<T extends FieldValues> {
    id: string
    title: string
    description?: string
    /** Form fields validated before advancing past this step */
    fields: Path<T>[]
    render: (form: UseFormReturn<T>) => ReactNode
    /** Items shown for this step on the auto-generated review step */
    reviewItems: (values: T) => KeyValueItem[]
    /**
     * Extra gate run before advancing past this step, for state held outside
     * the form (e.g. inline subnet drafts). Return false to block; the step is
     * responsible for surfacing its own error message.
     */
    validate?: () => boolean | Promise<boolean>
}

interface CreateWizardProps<T extends FieldValues, TInput extends FieldValues = T> {
    steps: WizardStep<T>[]
    form: UseFormReturn<TInput, unknown, T>
    /**
     * May return a promise. When it does, the footer stays disabled until it
     * settles, so a multi-second create cannot be double-submitted.
     */
    onSubmit: (values: T) => void | Promise<void>
    submitLabel: string
    isSubmitting?: boolean
    /**
     * Hold the final submit while an external precondition fails (e.g. the
     * account is at its quota for the resource being created). Stepping through
     * the wizard stays possible; only the review-step submit is gated.
     */
    submitDisabled?: boolean
    onCancel: () => void
    /** Let the step content span the full available width (full-bleed pages). */
    fullWidth?: boolean
    /**
     * Optional floating panel rendered beside the wizard (e.g. a live preview of
     * what's being created). Sticks to the top on wide screens and stacks below
     * the form on narrow ones. May be a node, or a render function that receives
     * the active step so the panel can react to where the user is in the flow.
     */
    aside?: ReactNode | ((ctx: WizardAsideContext) => ReactNode)
}

/** Context handed to an `aside` render function. */
export interface WizardAsideContext {
    /** Zero-based index of the active step (equals `stepCount` on the review step). */
    stepIndex: number
    /** Id of the active step, or "__review" on the auto-generated review step. */
    stepId: string
    /** True when the user is on the final review step. */
    isReview: boolean
}

export function CreateWizard<T extends FieldValues, TInput extends FieldValues = T>({
    steps,
    form,
    onSubmit,
    submitLabel,
    isSubmitting = false,
    submitDisabled = false,
    onCancel,
    fullWidth = false,
    aside,
}: Readonly<CreateWizardProps<T, TInput>>) {
    // The form's field (input) type may diverge from its resolved (output) type
    // T when zod coercion is used. Step renderers and reviewItems operate on the
    // resolved shape, so expose the form under that type.
    const resolvedForm = form as unknown as UseFormReturn<T>
    const { t } = useTranslation()
    const [currentIndex, setCurrentIndex] = useState(0)
    const [maxVisitedIndex, setMaxVisitedIndex] = useState(0)
    const [direction, setDirection] = useState(1)
    const [isAdvancing, setIsAdvancing] = useState(false)
    // Set when the schema rejects a submit. Without it the button looks broken:
    // a cross-field error has no field to attach to, so nothing appears.
    const [submitBlocked, setSubmitBlocked] = useState(false)

    const reviewIndex = steps.length
    // A step list can shrink (a conditional step disappearing when an earlier
    // answer changes). Clamped on read rather than corrected in an effect: an
    // effect would render one frame with the stale index first, and every
    // steps[...] read below would be undefined for that frame.
    const safeIndex = Math.min(currentIndex, reviewIndex)
    const safeMaxVisited = Math.min(maxVisitedIndex, reviewIndex)
    const isReview = safeIndex === reviewIndex
    const stepperSteps = [
        ...steps.map(({ id, title, description }) => ({ id, title, description })),
        { id: "__review", title: t("console.wizard.review") },
    ]

    const goTo = (index: number) => {
        setDirection(index > safeIndex ? 1 : -1)
        setCurrentIndex(index)
        setMaxVisitedIndex((max) => Math.max(max, index))
    }

    const next = async () => {
        // A step's `validate` may be async (waiting on a just-created VPC to be
        // realized, say). Without a pending flag the button stays live and a
        // second click fires a second check against stale state.
        if (isAdvancing) return
        const step = steps[safeIndex]
        setIsAdvancing(true)
        try {
            const valid = await resolvedForm.trigger(step.fields)
            if (!valid) {
                // A step validates whole field paths, so a rejection can come from
                // a nested field this step does not render — and then nothing on
                // screen changes and the button looks broken. Always say something.
                setSubmitBlocked(true)
                return
            }
            setSubmitBlocked(false)
            if (step.validate && !(await step.validate())) return
            goTo(safeIndex + 1)
        } finally {
            setIsAdvancing(false)
        }
    }

    const back = () => {
        if (safeIndex > 0) goTo(safeIndex - 1)
    }

    const submit = form.handleSubmit(
        async (values) => {
            setSubmitBlocked(false)
            await onSubmit(values)
        },
        () => {
            // Schema-level failures (a superRefine across listeners, say) resolve
            // to no visible field error on the review step, so say it plainly.
            setSubmitBlocked(true)
        }
    )

    const values = resolvedForm.getValues()

    const wizard = (
        <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:gap-12">
            <div className="lg:w-60 lg:shrink-0">
                <WizardStepper
                    steps={stepperSteps}
                    currentIndex={safeIndex}
                    maxVisitedIndex={safeMaxVisited}
                    onStepClick={goTo}
                />
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault()
                    if (isReview) void submit()
                    else void next()
                }}
                className={cn("flex min-w-0 flex-1 flex-col", fullWidth ? "w-full" : "max-w-2xl")}
            >
                {/* Scrolls internally so tall steps never slide behind the fixed
                    footer; horizontal overflow stays clipped for the slide anim. */}
                <div className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1">
                    <AnimatePresence mode="wait" initial={false} custom={direction}>
                        <motion.div
                            key={isReview ? "__review" : steps[safeIndex].id}
                            custom={direction}
                            variants={{
                                enter: (dir: number) => ({ opacity: 0, x: dir * 28 }),
                                center: { opacity: 1, x: 0 },
                                exit: (dir: number) => ({ opacity: 0, x: dir * -28 }),
                            }}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: DUR.base, ease: EASE.out }}
                        >
                            {isReview ? (
                                <WizardReviewStep
                                    groups={steps.map((step, index) => ({
                                        title: step.title,
                                        items: step.reviewItems(values),
                                        stepIndex: index,
                                    }))}
                                    onEdit={goTo}
                                />
                            ) : (
                                <div className="space-y-5">
                                    <div>
                                        <h2 className="text-base font-semibold text-foreground">
                                            {steps[safeIndex].title}
                                        </h2>
                                        {steps[safeIndex].description && (
                                            <p className="mt-0.5 text-[13px] text-muted-foreground">
                                                {steps[safeIndex].description}
                                            </p>
                                        )}
                                    </div>
                                    {steps[safeIndex].render(resolvedForm)}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {submitBlocked && (
                    <p role="alert" className="shrink-0 mt-3 text-[12px] text-destructive">
                        {t("console.wizard.fixErrors")}
                    </p>
                )}

                {/* Fixed footer: a static flex row pinned below the scroll region,
                    so content never slides underneath it. */}
                <div className="flex items-center justify-between gap-3 shrink-0 pt-4 mt-1 border-t border-border-glass">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        {t("console.wizard.cancel")}
                    </Button>
                    <div className="flex items-center gap-2">
                        {safeIndex > 0 && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={back}
                                disabled={isSubmitting || isAdvancing}
                                className="gap-1.5"
                            >
                                <ArrowLeft className="size-3.5" />
                                {t("console.wizard.back")}
                            </Button>
                        )}
                        {isReview ? (
                            <Button
                                type="submit"
                                variant="gold"
                                disabled={isSubmitting || submitDisabled}
                                className="gap-2"
                            >
                                {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                                {submitLabel}
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                variant="gold"
                                disabled={isAdvancing}
                                className="gap-1.5"
                            >
                                {isAdvancing && <Loader2 className="size-3.5 animate-spin" />}
                                {t("console.wizard.next")}
                                {!isAdvancing && <ArrowRight className="size-3.5" />}
                            </Button>
                        )}
                    </div>
                </div>
            </form>
        </div>
    )

    if (!aside) return wizard

    const asideContent =
        typeof aside === "function"
            ? aside({
                  stepIndex: safeIndex,
                  stepId: isReview ? "__review" : steps[safeIndex].id,
                  isReview,
              })
            : aside

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-6 xl:flex-row xl:gap-10">
            {wizard}
            <aside className="h-fit self-start xl:sticky xl:top-6 xl:w-90 xl:shrink-0">
                {asideContent}
            </aside>
        </div>
    )
}
