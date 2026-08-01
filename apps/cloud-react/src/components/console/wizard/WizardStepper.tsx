import { Check } from "lucide-react"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"

import { EASE } from "../motion/motion-config"

export interface WizardStepMeta {
    id: string
    title: string
    description?: string
}

type Variant = "default" | "onBrand"
type StepState = "current" | "completed" | "upcoming"

interface WizardStepperProps {
    steps: WizardStepMeta[]
    currentIndex: number
    /** Highest step index the user has reached — earlier steps are clickable */
    maxVisitedIndex: number
    onStepClick: (index: number) => void
    /**
     * `"default"` reads against the app surface; `"onBrand"` is tuned for the
     * coloured brand rail (white-on-dark scrim) and keeps every step state
     * legible and distinct without relying on a blanket colour override.
     */
    variant?: Variant
}

/** Per-state class tokens, resolved up-front to keep the JSX free of nested ternaries. */
const STEP_STYLES: Record<
    Variant,
    Record<StepState, { circle: string; title: string; desc: string }>
> = {
    default: {
        current: {
            circle: "border-transparent bg-brand-gold text-brand-gold-foreground font-semibold shadow-sm ring-2 ring-brand-gold/30",
            title: "text-foreground",
            desc: "text-muted-foreground/80",
        },
        completed: {
            circle: "border-brand-gold/45 bg-brand-gold/15 text-brand-gold",
            title: "text-muted-foreground",
            desc: "text-muted-foreground/80",
        },
        upcoming: {
            circle: "border-border-glass text-muted-foreground",
            title: "text-muted-foreground",
            desc: "text-muted-foreground/80",
        },
    },
    onBrand: {
        current: {
            circle: "border-transparent bg-brand-gold text-brand-gold-foreground font-semibold shadow-sm ring-2 ring-brand-gold/30",
            title: "text-white font-semibold",
            desc: "text-white/65",
        },
        completed: {
            circle: "border-brand-gold/45 bg-brand-gold/15 text-brand-gold",
            title: "text-white/80",
            desc: "text-white/40",
        },
        upcoming: {
            circle: "border-white/20 text-white/55",
            title: "text-white/55",
            desc: "text-white/40",
        },
    },
}

export function WizardStepper({
    steps,
    currentIndex,
    maxVisitedIndex,
    onStepClick,
    variant = "default",
}: Readonly<WizardStepperProps>) {
    const onBrand = variant === "onBrand"
    return (
        <ol className="flex lg:flex-col gap-1 lg:gap-0 overflow-x-auto lg:overflow-visible">
            {steps.map((step, index) => {
                const isCurrent = index === currentIndex
                const isCompleted = index < currentIndex
                const isReachable = index <= maxVisitedIndex && !isCurrent
                const s = STEP_STYLES[variant][stepState(isCurrent, isCompleted)]
                return (
                    <li key={step.id} className="flex lg:items-stretch shrink-0">
                        <button
                            type="button"
                            disabled={!isReachable}
                            onClick={() => {
                                onStepClick(index)
                            }}
                            className={cn(
                                "relative flex items-center lg:items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors outline-none focus-visible:ring-2 w-full",
                                "focus-visible:ring-brand-gold/60",
                                isReachable && "cursor-pointer",
                                isReachable && "hover:bg-brand-gold/10",
                                !isReachable &&
                                    !isCurrent &&
                                    (onBrand ? "opacity-70" : "opacity-50")
                            )}
                        >
                            <span className="relative flex flex-col items-center shrink-0">
                                <span
                                    className={cn(
                                        "flex size-6 items-center justify-center rounded-full border font-mono text-[11px] transition-colors",
                                        s.circle
                                    )}
                                >
                                    {isCompleted ? <Check className="size-3" /> : index + 1}
                                </span>
                                {index < steps.length - 1 && (
                                    <span
                                        className={cn(
                                            "hidden lg:block w-px flex-1 min-h-4 mt-1",
                                            connectorClass(onBrand, isCompleted)
                                        )}
                                    />
                                )}
                            </span>
                            <span className="min-w-0 lg:pb-4">
                                <span
                                    className={cn(
                                        "block text-[13px] font-medium whitespace-nowrap lg:whitespace-normal",
                                        s.title
                                    )}
                                >
                                    {step.title}
                                </span>
                                {step.description && (
                                    <span
                                        className={cn("hidden lg:block text-[11px] mt-0.5", s.desc)}
                                    >
                                        {step.description}
                                    </span>
                                )}
                            </span>
                            {isCurrent && (
                                <motion.span
                                    layoutId="wizard-step-active"
                                    transition={EASE.spring}
                                    className={cn(
                                        "absolute inset-0 rounded-lg border -z-10",
                                        "border-brand-gold/20 bg-brand-gold/10"
                                    )}
                                />
                            )}
                        </button>
                    </li>
                )
            })}
        </ol>
    )
}

function stepState(isCurrent: boolean, isCompleted: boolean): StepState {
    if (isCurrent) return "current"
    if (isCompleted) return "completed"
    return "upcoming"
}

function connectorClass(onBrand: boolean, isCompleted: boolean): string {
    if (!onBrand) return "bg-border-glass"
    return isCompleted ? "bg-brand-gold/50" : "bg-white/15"
}
