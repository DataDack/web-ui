import { expect, mock, test } from "bun:test"

import { render, screen } from "@testing-library/react"

// Exact payloads the live API returns for this node + AZ list.
const NODE = {
    id: "019f41cf-1170-70f3-84f2-b4af8d4650c1",
    availability_zone_id: "019ef08e-d0fd-7eba-a2c3-19cfe5e0fea0",
    name: "pve1-a",
    // eslint-disable-next-line sonarjs/no-hardcoded-ip -- inert fixture mirroring the backend row shape; never dialled
    ip_address: "167.104.222.3",
    status: "online",
    cpu_total: 24,
    cpu_used: 0,
    ram_total_mb: 31991,
    ram_used_mb: 3854,
    storage_total_gb: 95,
    storage_used_gb: 34,
    username: "root@pam!fullaccess",
}
const AZS = [
    { id: "019ef08e-d0fd-7eba-a2c3-19cfe5e0fea0", code: "ap-south-3a", name: "Noida 3A" },
    { id: "019ef09c-ebd4-73bf-bc1e-855f8514c5b8", code: "ap-south-3b", name: "Noida 3B" },
]

// Per-request latency, set by each test to control which query resolves first.
const delay: { azs: number; node: number } = { azs: 0, node: 0 }
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

await mock.module("react-i18next", () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}))

// Mock only the HTTP layer: real hooks, real react-query, real component — so
// this exercises the actual load ordering.
await mock.module("@/services/api/client", () => ({
    api: {},
    apiGet: async (url: string) => {
        if (url.includes("/availability-zones/all")) {
            await sleep(delay.azs)
            return AZS
        }
        if (url.includes("/pve-nodes/")) {
            await sleep(delay.node)
            return NODE
        }
        return []
    },
    apiPost: () => Promise.resolve({}),
    apiPut: () => Promise.resolve({}),
    apiPatch: () => Promise.resolve({}),
    apiDelete: () => Promise.resolve({}),
    LIST_QUERY: "",
    extractError: (_e: unknown, fallback: string) => fallback,
}))

const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query")
const { MemoryRouter, Route, Routes } = await import("react-router-dom")
const { PVENodeFormPage } = await import("@/modules/superadmin/partials/PVENodeFormPage")

function renderForm() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
        <QueryClientProvider client={qc}>
            <MemoryRouter initialEntries={[`/admin/pve-nodes/${NODE.id}/edit`]}>
                <Routes>
                    <Route path="/admin/pve-nodes/:id/edit" element={<PVENodeFormPage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    )
}

// The AZ trigger is the first combobox on the Placement step.
async function azTriggerText() {
    const trigger = await screen.findByRole("combobox")
    return trigger.textContent
}

test("AZ list resolves BEFORE the node", async () => {
    delay.azs = 0
    delay.node = 60
    renderForm()
    expect(await screen.findByDisplayValue("pve1-a")).toBeInTheDocument()
    await sleep(150)
    const boxes = screen.queryAllByRole("combobox")
    console.log("  comboboxes:", boxes.length)
    const text = await azTriggerText()
    console.log("  AZ trigger after az-first load:", JSON.stringify(text))
    expect(text).toContain("ap-south-3a")
})

test("node resolves BEFORE the AZ list", async () => {
    delay.azs = 60
    delay.node = 0
    renderForm()
    expect(await screen.findByDisplayValue("pve1-a")).toBeInTheDocument()
    await sleep(150) // let the AZ query land and any reset settle
    const text = await azTriggerText()
    console.log("  AZ trigger after node-first load:", JSON.stringify(text))
    expect(text).toContain("ap-south-3a")
})
