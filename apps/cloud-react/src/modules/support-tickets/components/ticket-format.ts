/** Format an RFC3339 timestamp for ticket UI, or an em dash when missing/invalid. */
export function formatTicketDateTime(raw: string): string {
    if (!raw) return "—"
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString()
}

/** Best display label for a joined person: full name, else email, else a short
 *  prefix of their UUID, else an em dash. Used everywhere a ticket references a
 *  user (filer, assignee, comment author) so the UI shows a human, not a UUID. */
export function formatTicketPerson(
    id?: string,
    name?: string,
    email?: string,
    fallback = "—"
): string {
    if (name) return name
    if (email) return email
    if (id) return id.slice(0, 8)
    return fallback
}

/** "Name (12345678…)" style account label, tolerant of missing pieces. */
export function formatTicketAccount(name?: string, number?: string): string {
    if (name && number) return `${name} · ${number}`
    return name || number || "—"
}
