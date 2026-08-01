import { z } from "zod/v4"

import type { CreateChannelRequest, TestChannelRequest } from "../monitoring.types"
import { CHANNEL_TYPES, SEVERITIES } from "./channels.meta"

function isHttpsUrl(value: string): boolean {
    try {
        return new URL(value).protocol === "https:"
    } catch {
        return false
    }
}

const DISCORD_WEBHOOK_RE = /^https:\/\/(?:\w+\.)?discord(?:app)?\.com\/api\/webhooks\//

interface ChannelFormDraft {
    type: (typeof CHANNEL_TYPES)[number]
    discordWebhookUrl?: string
    jiraAuthMode?: "oauth" | "token"
    jiraBaseUrl?: string
    jiraEmail?: string
    jiraApiToken?: string
    jiraProjectKey?: string
    webhookUrl?: string
}

interface ValidationIssue {
    path: string
    message: string
}

function issue(path: string, message: string): ValidationIssue {
    return { path, message }
}

function validateDiscord(v: ChannelFormDraft): ValidationIssue[] {
    const url = v.discordWebhookUrl?.trim() ?? ""
    if (!url) return [issue("discordWebhookUrl", "Webhook URL is required")]
    if (!DISCORD_WEBHOOK_RE.test(url)) {
        return [
            issue(
                "discordWebhookUrl",
                "Must be a Discord webhook URL (https://discord.com/api/webhooks/...)"
            ),
        ]
    }
    return []
}

function validateJira(v: ChannelFormDraft): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    if ((v.jiraAuthMode ?? "oauth") === "token") {
        const baseUrl = v.jiraBaseUrl?.trim() ?? ""
        if (!baseUrl) issues.push(issue("jiraBaseUrl", "Base URL is required"))
        else if (!isHttpsUrl(baseUrl)) issues.push(issue("jiraBaseUrl", "Must be an https:// URL"))

        const email = v.jiraEmail?.trim() ?? ""
        if (!email) issues.push(issue("jiraEmail", "Email is required"))
        else if (!z.email().safeParse(email).success)
            issues.push(issue("jiraEmail", "Must be a valid email"))

        if (!v.jiraApiToken?.trim()) issues.push(issue("jiraApiToken", "API token is required"))
    }
    if (!v.jiraProjectKey?.trim()) issues.push(issue("jiraProjectKey", "Project key is required"))
    return issues
}

function validateWebhook(v: ChannelFormDraft): ValidationIssue[] {
    const url = v.webhookUrl?.trim() ?? ""
    if (!url) return [issue("webhookUrl", "URL is required")]
    if (!isHttpsUrl(url)) return [issue("webhookUrl", "Must be an https:// URL")]
    return []
}

function validateChannel(v: ChannelFormDraft): ValidationIssue[] {
    if (v.type === "discord") return validateDiscord(v)
    if (v.type === "jira") return validateJira(v)
    return validateWebhook(v)
}

export const channelSchema = z
    .object({
        name: z.string().max(120, "Maximum 120 characters").optional(),
        type: z.enum(CHANNEL_TYPES),
        severity: z.enum(SEVERITIES),
        discordWebhookUrl: z.string().optional(),
        jiraAuthMode: z.enum(["oauth", "token"]).optional(),
        jiraCloudId: z.string().optional(),
        jiraBaseUrl: z.string().optional(),
        jiraEmail: z.string().optional(),
        jiraApiToken: z.string().optional(),
        jiraProjectKey: z.string().optional(),
        jiraIssueType: z.string().optional(),
        jiraLabels: z.string().optional(),
        webhookUrl: z.string().optional(),
        webhookSecret: z.string().optional(),
    })
    .superRefine((v, ctx) => {
        for (const validationIssue of validateChannel(v)) {
            ctx.addIssue({
                code: "custom",
                path: [validationIssue.path],
                message: validationIssue.message,
            })
        }
    })

export type ChannelFormValues = z.infer<typeof channelSchema>

export function splitJiraLabels(labels?: string): string[] {
    const seen = new Set<string>()
    const out: string[] = []
    for (const label of labels?.split(",") ?? []) {
        const trimmed = label.trim()
        if (!trimmed || seen.has(trimmed)) continue
        seen.add(trimmed)
        out.push(trimmed)
    }
    return out
}

export function buildConfigBlocks(
    v: ChannelFormValues
): Pick<CreateChannelRequest, "discord" | "jira" | "webhook"> {
    if (v.type === "discord") {
        return { discord: { webhook_url: (v.discordWebhookUrl ?? "").trim() } }
    }
    if (v.type === "jira") {
        const issueType = v.jiraIssueType?.trim() ?? ""
        const labels = splitJiraLabels(v.jiraLabels)
        const projectKey = (v.jiraProjectKey ?? "").trim()
        const resolvedIssueType = issueType === "" ? "Task" : issueType
        if ((v.jiraAuthMode ?? "oauth") === "oauth") {
            const cloudId = v.jiraCloudId?.trim()
            return {
                jira: {
                    auth_mode: "oauth",
                    ...(cloudId ? { cloud_id: cloudId } : {}),
                    project_key: projectKey,
                    issue_type: resolvedIssueType,
                    ...(labels.length ? { labels } : {}),
                },
            }
        }
        return {
            jira: {
                auth_mode: "token",
                base_url: (v.jiraBaseUrl ?? "").trim(),
                email: (v.jiraEmail ?? "").trim(),
                api_token: (v.jiraApiToken ?? "").trim(),
                project_key: projectKey,
                issue_type: resolvedIssueType,
                ...(labels.length ? { labels } : {}),
            },
        }
    }
    const secret = v.webhookSecret?.trim()
    return {
        webhook: {
            url: (v.webhookUrl ?? "").trim(),
            ...(secret ? { secret } : {}),
        },
    }
}

export function buildTestPayload(v: ChannelFormValues): TestChannelRequest {
    return { type: v.type, severity: v.severity, ...buildConfigBlocks(v) }
}

export function buildCreatePayload(v: ChannelFormValues): CreateChannelRequest {
    return {
        name: (v.name ?? "").trim(),
        type: v.type,
        min_severity: v.severity,
        ...buildConfigBlocks(v),
    }
}
