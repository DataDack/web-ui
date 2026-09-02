import {
  Badge,
  Button,
  cn,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@datadack/common-ui"
import { ArrowDown, ArrowUp, Eye, Plus, ShieldBan, Trash2 } from "lucide-react"

import { CidrInput, Section } from "@/components/console"

import {
  ACTION_LABELS,
  canAdd,
  ipRuleCount,
  isValidCidr,
  MODE_LABELS,
  newIpRule,
  quotaLabel,
  type IpRuleDraft,
} from "./restrictions-draft"
import type { IpRuleAction, WafMode } from "../../../../managed-apps.types"

interface IpRulesPanelProps {
  rules: IpRuleDraft[]
  onChange: (rules: IpRuleDraft[]) => void
  max: number
  disabled?: boolean
}

/**
 * The address list.
 *
 * ORDER IS THE FEATURE, which is why this is a numbered list with move
 * controls rather than a table that could be sorted. The edge takes the FIRST
 * rule that matches, so "deny 203.0.113.0/24, allow 203.0.113.9" and the same
 * two lines the other way round are different policies — one lets the office
 * in, the other does not. A control that could reorder them silently would be
 * a control that changes who can reach the app.
 *
 * Every deny carries a mode, and it starts at "Log only". A mistyped prefix in
 * a deny rule is how somebody locks their own office out of their own site, and
 * the mistake is invisible until a colleague phones. In log mode the rule
 * reports what it would have refused and refuses nothing, which is the only way
 * to find that the prefix was wrong before it matters.
 *
 * An allow rule has no mode. "Would have allowed" is indistinguishable from
 * what already happens, so offering the choice would be offering a switch with
 * one position.
 */
export function IpRulesPanel({ rules, onChange, max, disabled }: Readonly<IpRulesPanelProps>) {
  const used = ipRuleCount(rules)
  const addable = canAdd(used, max) && !disabled
  // A tier that sells zero is not the same as one at its ceiling: nothing here
  // is upgradeable by deleting a rule, so the empty state says so instead of
  // showing an Add button that can never be pressed.
  const sellsNone = max === 0

  const replace = (id: string, next: Partial<IpRuleDraft>) => {
    onChange(rules.map((rule) => (rule.id === id ? { ...rule, ...next } : rule)))
  }

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= rules.length) return
    const next = [...rules]
    ;[next[index], next[target]] = [next[target], next[index]] as [IpRuleDraft, IpRuleDraft]
    onChange(next)
  }

  return (
    <Section
      variant="panel"
      icon={ShieldBan}
      tone="warning"
      title="IP restrictions"
      description="Allow or deny visitors by address or CIDR range. Rules are evaluated top to bottom and the first match wins, so an allow above a deny keeps that address in."
      badge={
        <Badge variant="secondary" className="font-normal">
          {quotaLabel(used, max)}
        </Badge>
      }
      actions={
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={!addable}
          onClick={() => {
            onChange([...rules, newIpRule()])
          }}
        >
          <Plus className="size-3.5" />
          Add rule
        </Button>
      }
    >
      {rules.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/70 px-4 py-6 text-center text-[13px] text-muted-foreground">
          {sellsNone
            ? "This plan does not include IP restrictions. Every address can reach this app."
            : "No address rules. Every address can reach this app."}
        </p>
      ) : (
        <ol className="space-y-2.5">
          {rules.map((rule, index) => {
            const invalid = rule.cidr.trim() !== "" && !isValidCidr(rule.cidr)
            return (
              <li
                key={rule.id}
                className={cn(
                  "rounded-lg border border-border/70 p-3",
                  rule.action === "allow" ? "bg-status-success-bg/30" : "bg-status-warning-bg/20",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="w-5 shrink-0 text-center font-mono text-[11px] text-muted-foreground tabular-nums"
                    aria-hidden
                  >
                    {index + 1}
                  </span>

                  <Select
                    value={rule.action}
                    disabled={disabled}
                    onValueChange={(value) => {
                      replace(rule.id, { action: value as IpRuleAction })
                    }}
                  >
                    <SelectTrigger
                      className="h-9 w-[92px]"
                      aria-label={`Rule ${String(index + 1)} action`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ACTION_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <CidrInput
                    value={rule.cidr}
                    disabled={disabled}
                    aria-label={`Rule ${String(index + 1)} address`}
                    aria-invalid={invalid}
                    onChange={(value) => {
                      replace(rule.id, { cidr: value })
                    }}
                  />

                  {rule.action === "deny" ? (
                    <Select
                      value={rule.mode ?? "log"}
                      disabled={disabled}
                      onValueChange={(value) => {
                        replace(rule.id, { mode: value as WafMode })
                      }}
                    >
                      <SelectTrigger
                        className="h-9 w-[116px]"
                        aria-label={`Rule ${String(index + 1)} mode`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(MODE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="inline-flex h-9 items-center gap-1.5 px-1 text-[11px] text-muted-foreground">
                      <Eye className="size-3.5" aria-hidden />
                      Always applied
                    </span>
                  )}

                  <div className="ml-auto flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground"
                      aria-label={`Move rule ${String(index + 1)} up`}
                      disabled={Boolean(disabled) || index === 0}
                      onClick={() => {
                        move(index, -1)
                      }}
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground"
                      aria-label={`Move rule ${String(index + 1)} down`}
                      disabled={Boolean(disabled) || index === rules.length - 1}
                      onClick={() => {
                        move(index, 1)
                      }}
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      aria-label={`Delete rule ${String(index + 1)}`}
                      disabled={disabled}
                      onClick={() => {
                        onChange(rules.filter((item) => item.id !== rule.id))
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 pl-7">
                  <Input
                    value={rule.note ?? ""}
                    placeholder="Why this rule exists — a team, a ticket, a partner"
                    aria-label={`Rule ${String(index + 1)} note`}
                    maxLength={200}
                    disabled={disabled}
                    className="h-8 flex-1 text-[12px]"
                    onChange={(event) => {
                      replace(rule.id, { note: event.target.value })
                    }}
                  />
                </div>

                {invalid && (
                  <p className="mt-1.5 pl-7 text-[11px] text-destructive">
                    Not an address or CIDR range. Use 203.0.113.9 or 203.0.113.0/24.
                  </p>
                )}
                {rule.action === "deny" && rule.mode === "log" && rule.cidr.trim() !== "" && (
                  <p className="mt-1.5 pl-7 text-[11px] text-muted-foreground">
                    Watching only — this range is recorded and still served. Switch to Block once the
                    range looks right.
                  </p>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {rules.length > 0 && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Addresses are stored masked to their range: 203.0.113.9/24 is kept as 203.0.113.0/24,
          because a prefix with host bits left in matches nothing.
        </p>
      )}
    </Section>
  )
}
