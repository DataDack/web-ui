import { createElement, Fragment, type ReactNode } from "react"

import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, mock, test } from "bun:test"

import { i18nMock } from "./i18n-mock"

const ACCOUNT_ID = "acct-1"
const ACCOUNT_NUMBER = "ACC-1001"

const getCalls: string[] = []
const deleteCalls: string[] = []

const overview = {
  stats: { organizations: 1, accounts: 1, users: 1, orphan_users: 0 },
  organizations: [
    {
      id: "org-1",
      name: "Demo Org",
      slug: "demo-org",
      billing_email: "billing@example.com",
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      account_count: 1,
      user_count: 1,
      accounts: [],
      users: [],
    },
  ],
  accounts: [
    {
      id: ACCOUNT_ID,
      organization_id: "org-1",
      org_name: "Demo Org",
      account_number: ACCOUNT_NUMBER,
      name: "Demo Account",
      status: "active",
      is_default: true,
      permanent_discount: 0,
      permanent_discount_reason: "",
      balance: 120,
      created_at: "2026-01-01T00:00:00Z",
      members: [],
    },
  ],
  users: [],
  orphan_users: [],
}

const spend = {
  account_id: ACCOUNT_ID,
  currency: "INR",
  active_resources: 1,
  monthly_recurring: 100,
  hourly_rate: 1,
  hourly_monthly: 720,
  monthly_total: 820,
  wallet_balance: 120,
  by_kind: [{ kind: "compute", count: 1, monthly_amount: 820 }],
  by_status: { active: 1 },
}

function noop() {
  return undefined
}

// Resolves real copy from en.json: the queries below look for what a user
// reads, which only works if `t` returns the translation rather than the key.
void mock.module("react-i18next", () => i18nMock)

void mock.module("sonner", () => ({
  toast: {
    success: mock(noop),
    error: mock(noop),
  },
}))

interface MotionProps {
  children?: ReactNode
  [key: string]: unknown
}

const motionOnlyProps = [
  "initial",
  "animate",
  "exit",
  "variants",
  "transition",
  "whileHover",
  "whileTap",
  "layout",
] as const

function MotionPassthrough({ children }: Readonly<{ children?: ReactNode }>) {
  return createElement(Fragment, null, children)
}

function createMotionElement(tag: string) {
  function MotionElement({ children, ...domProps }: Readonly<MotionProps>) {
    for (const key of motionOnlyProps) Reflect.deleteProperty(domProps, key)
    return createElement(tag, domProps, children)
  }

  return MotionElement
}

void mock.module("motion/react", () => ({
  AnimatePresence: MotionPassthrough,
  MotionConfig: MotionPassthrough,
  animate: () => ({ stop: noop }),
  useReducedMotion: () => true,
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) => createMotionElement(tag),
    },
  ),
}))

void mock.module("@/services/api/screen", () => ({
  useScreen: noop,
}))

void mock.module("@/services/api/client", () => ({
  api: {},
  apiGet: mock((url: string) => {
    getCalls.push(url)
    if (url === "/org/overview") return Promise.resolve(overview)
    if (url === `/resources/search/accounts/${ACCOUNT_ID}/resources`) {
      return Promise.resolve([
        {
          id: "vm-1",
          name: "vm-1",
          service: "compute",
          type: "vm",
          region: "noida",
          status: "running",
          meta: ["2 vCPU"],
          updated_at: "2026-01-01T00:00:00Z",
        },
      ])
    }
    if (url === `/billing/charge/accounts/${ACCOUNT_ID}/spend`) return Promise.resolve(spend)
    throw new Error(`Unexpected GET ${url}`)
  }),
  apiDelete: mock((url: string) => {
    deleteCalls.push(url)
    return Promise.resolve({
      account_id: ACCOUNT_ID,
      status: "deleting",
      cleanup_started: true,
    })
  }),
  apiPost: mock(() => Promise.resolve({})),
  apiPut: mock(() => Promise.resolve({})),
  apiPatch: mock(() => Promise.resolve({})),
  LIST_QUERY: "",
  extractError: (_e: unknown, fallback: string) => fallback,
}))

const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query")
const { MemoryRouter, Route, Routes } = await import("react-router-dom")
const { AccountResourcesPage } = await import("@/modules/superadmin/partials/AccountResourcesPage")

function renderPage() {
  getCalls.length = 0
  deleteCalls.length = 0
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/admin/accounts/${ACCOUNT_ID}/resources`]}>
        <Routes>
          <Route path="/admin/accounts/:accountId/resources" element={<AccountResourcesPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

test("delete account confirmation calls the super-admin teardown API and refreshes views", async () => {
  const user = userEvent.setup()
  renderPage()

  expect(await screen.findByRole("heading", { name: "Demo Account" })).not.toBeNull()

  await user.click(screen.getByRole("button", { name: /delete account/i }))

  expect(await screen.findByText(/All active resources will be deleted/i)).not.toBeNull()
  expect(screen.getByText(/Static IPs will be released back to the pool/i)).not.toBeNull()
  expect(screen.getByText(/Billing history, invoices, ledger entries/i)).not.toBeNull()
  expect(screen.getByText(/Auth users are not deleted/i)).not.toBeNull()

  const confirmButton = screen.getAllByRole("button", { name: /delete account/i }).at(-1)
  if (!confirmButton) throw new Error("Expected delete confirmation button")
  expect((confirmButton as HTMLButtonElement).disabled).toBe(true)

  await user.type(screen.getByPlaceholderText(ACCOUNT_NUMBER), ACCOUNT_NUMBER)
  expect((confirmButton as HTMLButtonElement).disabled).toBe(false)
  await user.click(confirmButton)

  await waitFor(() => {
    expect(deleteCalls).toContain(`/org/accounts/${ACCOUNT_ID}/super-admin-delete`)
  })
  await waitFor(() => {
    expect(getCalls.filter((url) => url === "/org/overview").length).toBeGreaterThan(1)
    expect(
      getCalls.filter((url) => url === `/resources/search/accounts/${ACCOUNT_ID}/resources`).length,
    ).toBeGreaterThan(1)
    expect(
      getCalls.filter((url) => url === `/billing/charge/accounts/${ACCOUNT_ID}/spend`).length,
    ).toBeGreaterThan(1)
  })
})
