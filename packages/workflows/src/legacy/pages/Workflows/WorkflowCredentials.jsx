import React, { useState, useContext, useMemo, useCallback, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Key,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  Search,
  Unlink,
  ChevronDown,
  ExternalLink,
  RefreshCw,
} from "lucide-react"
import { SiGithub, SiGoogle, SiJira } from "react-icons/si"
import { BsMicrosoft } from "react-icons/bs"
import { toast } from "react-toastify"
import { credentialsApi } from "../../api/workflowCredentials"
import { accountsApi } from "../../api/accounts"
import { integrationsApi } from "../../api/integrations"
import { getCredentialSchema } from "./partials/credentialSchemas"
import CredentialSheet, { CredentialIcon } from "./partials/CredentialSheet"
import { StatusContext } from "../../context/Status"
import { UserContext } from "../../context/User"
import FeatureGate from "../../components/FeatureGate"
import { getTransport } from "../../../runtime"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from "@datadack/common-ui"

// OAuth providers available via Connected Accounts
const OAUTH_PROVIDERS = {
  github: { label: "GitHub", icon: SiGithub, color: "#24292f" },
  google: { label: "Google", icon: SiGoogle, color: "#4285F4" },
  microsoft: { label: "Microsoft", icon: BsMicrosoft, color: "#0078D4" },
  jira: { label: "Jira", icon: SiJira, color: "#0052CC" },
}

// Provider "manage permissions" URLs — where the user reviews/revokes the
// OAuth app's scopes on the provider's side.
function getProviderConfigureUrl(provider) {
  switch (provider) {
    case "github":
      return integrationsApi.githubManageUrl()
    case "google":
      return "https://myaccount.google.com/permissions"
    case "microsoft":
      return "https://myaccount.microsoft.com/privacy#apps-and-services"
    case "jira":
      return "https://id.atlassian.com/manage-profile/apps"
    default:
      return null
  }
}

function CredentialCard({ row, onEdit, onDelete, onReconnect }) {
  const isAccount = row._kind === "account"
  const RowIcon = row.icon
  const [confirmOpen, setConfirmOpen] = useState(false)
  const configureUrl = isAccount ? getProviderConfigureUrl(row.typeKey) : null

  return (
    <Card className="group relative overflow-hidden hover:border-primary/40 transition-colors">
      {isAccount && row.color && (
        <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: row.color }} />
      )}
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border"
            style={
              isAccount
                ? { background: `${row.color}10`, borderColor: `${row.color}30` }
                : undefined
            }
          >
            {isAccount && RowIcon ? (
              <RowIcon size={18} className="text-foreground" />
            ) : (
              <CredentialIcon credType={row.typeKey} size={16} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold truncate">{row.name}</span>
              {isAccount && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-px shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-medium text-emerald-600">Connected</span>
                </span>
              )}
            </div>
            {isAccount && row.email && row.email !== row.name && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{row.email}</p>
            )}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                {row.typeLabel}
              </Badge>
              {row.created_at && (
                <span className="text-[10px] text-muted-foreground">
                  {new Date(row.created_at * 1000).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {isAccount ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Manage
                    <ChevronDown size={11} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  {configureUrl && (
                    <DropdownMenuItem
                      className="gap-2 text-xs"
                      onClick={() => window.open(configureUrl, "_blank", "noopener,noreferrer")}
                    >
                      <ExternalLink size={13} />
                      Configure on {row.typeLabel}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="gap-2 text-xs" onClick={() => onReconnect(row)}>
                    <RefreshCw size={13} />
                    Reconnect
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 text-xs text-destructive focus:text-destructive"
                    onSelect={(e) => {
                      e.preventDefault()
                      setConfirmOpen(true)
                    }}
                  >
                    <Unlink size={13} />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onEdit(row)}
                >
                  <Pencil size={12} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setConfirmOpen(true)}
                >
                  <Trash2 size={12} />
                </Button>
              </>
            )}
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-sm">
                    {isAccount ? "Disconnect account" : "Delete credential"}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs">
                    {isAccount
                      ? `Disconnect "${row.name}"? Workflows using this account will need to be reconfigured.`
                      : `Are you sure you want to delete "${row.name}"? Workflows using this credential will need to be reconfigured.`}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="h-8 text-xs bg-destructive hover:bg-destructive/90"
                    onClick={() => onDelete(row)}
                  >
                    {isAccount ? "Disconnect" : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function WorkflowCredentials() {
  const queryClient = useQueryClient()
  const [statusState] = useContext(StatusContext)
  const [userState] = useContext(UserContext)
  const userId = userState?.user?.id
  const connectedAccountsAvailable = getTransport().capabilities?.connectedAccounts === true

  const [search, setSearch] = useState("")
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetCredType, setSheetCredType] = useState(null)
  const [sheetEditCred, setSheetEditCred] = useState(null)

  const maintenanceConfig = useMemo(() => {
    try {
      const raw = statusState?.status?.maintenance_mode
      if (raw) return JSON.parse(raw)
    } catch (e) {}
    return {}
  }, [statusState?.status?.maintenance_mode])

  const featureStatus =
    maintenanceConfig.workflows === true ? "maintenance" : maintenanceConfig.workflows || "off"

  const { data: connectedAccounts, isLoading: accountsLoading } = useQuery({
    queryKey: ["connected-accounts"],
    queryFn: () => accountsApi.list(),
    enabled: featureStatus === "off" && connectedAccountsAvailable,
  })

  const { data: credentials, isLoading: credsLoading } = useQuery({
    queryKey: ["workflow-credentials"],
    queryFn: () => credentialsApi.list(),
    enabled: featureStatus === "off",
  })

  const disconnectMutation = useMutation({
    mutationFn: (id) => accountsApi.disconnect(id),
    onSuccess: () => {
      toast.success("Account disconnected")
      queryClient.invalidateQueries({ queryKey: ["connected-accounts"] })
    },
    onError: (err) => toast.error(`Disconnect failed: ${err.message}`),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => credentialsApi.delete(id),
    onSuccess: () => {
      toast.success("Credential deleted")
      queryClient.invalidateQueries({ queryKey: ["workflow-credentials"] })
    },
    onError: (err) => toast.error(`Delete failed: ${err.message}`),
  })

  // Listen for OAuth popup callback
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === "account-connected") {
        queryClient.invalidateQueries({ queryKey: ["connected-accounts"] })
        toast.success(`${event.data.provider} account connected`)
      }
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [queryClient])

  const handleConnectProvider = useCallback((provider) => {
    accountsApi.connect(provider).catch((error) => {
      toast.error(`Could not start the ${provider} connection: ${error.message}`)
    })
  }, [])

  const openCreateSheet = useCallback(() => {
    setSheetCredType(null)
    setSheetEditCred(null)
    setSheetOpen(true)
  }, [])

  const openEditSheet = useCallback(async (row) => {
    try {
      const full = await credentialsApi.get(row.id)
      setSheetCredType(row.typeKey)
      setSheetEditCred(full)
      setSheetOpen(true)
    } catch (e) {
      toast.error("Failed to load credential")
    }
  }, [])

  const handleCredSaved = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["workflow-credentials"] })
  }, [queryClient])

  const handleDelete = useCallback(
    (row) => {
      if (row._kind === "account") {
        disconnectMutation.mutate(row.id)
      } else {
        deleteMutation.mutate(row.id)
      }
    },
    [disconnectMutation, deleteMutation],
  )

  // Unified row list: connected accounts + credentials
  const unifiedRows = useMemo(() => {
    const accounts = Array.isArray(connectedAccounts) ? connectedAccounts : []
    const creds = Array.isArray(credentials) ? credentials : []

    const accountRows = accounts.map((a) => {
      const meta = OAUTH_PROVIDERS[a.provider] || {}
      return {
        _kind: "account",
        id: a.id,
        name: a.account_label || a.account_email || a.provider,
        email: a.account_email,
        typeKey: a.provider,
        typeLabel: meta.label || a.provider,
        created_at: a.created_at,
        icon: meta.icon,
        color: meta.color,
      }
    })

    const credRows = creds.map((c) => {
      const schema = getCredentialSchema(c.type)
      return {
        _kind: "credential",
        id: c.id,
        name: c.name,
        typeKey: c.type,
        typeLabel: schema?.label || c.type,
        created_at: c.created_at,
        raw: c,
      }
    })

    return [...accountRows, ...credRows]
  }, [connectedAccounts, credentials])

  const filteredRows = useMemo(() => {
    if (!search) return unifiedRows
    const q = search.toLowerCase()
    return unifiedRows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.typeLabel.toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q),
    )
  }, [unifiedRows, search])

  if (featureStatus !== "off") {
    return (
      <FeatureGate
        feature="workflows"
        featureLabel="Credentials"
        status={featureStatus}
        maintenanceConfig={maintenanceConfig}
      />
    )
  }

  const loading = (connectedAccountsAvailable && accountsLoading) || credsLoading

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
          <Key size={18} className="text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-tight">Credentials</h1>
          <p className="text-xs text-muted-foreground">
            {connectedAccountsAvailable
              ? "Manage connected accounts and API credentials"
              : "Manage API keys and service credentials"}
          </p>
        </div>
      </div>

      {/* Search + Add button */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search credentials..."
            className="h-8 pl-8 text-xs"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="h-8 text-xs gap-1.5 ml-auto">
              <Plus size={14} />
              Add
              <ChevronDown size={12} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            {connectedAccountsAvailable && (
              <>
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Connect OAuth Account
                </DropdownMenuLabel>
                {Object.entries(OAUTH_PROVIDERS).map(([key, meta]) => {
                  const Icon = meta.icon
                  return (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => handleConnectProvider(key)}
                      className="gap-2 text-xs"
                    >
                      <Icon size={14} style={{ color: meta.color }} />
                      {meta.label}
                    </DropdownMenuItem>
                  )
                })}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              API Credential
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={openCreateSheet} className="gap-2 text-xs">
              <Key size={14} />
              New credential (API key, token)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Grid of cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Key size={32} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {search ? "No credentials match your search" : "No credentials yet"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {search
              ? "Try a different search term"
              : 'Click "Add" to connect an account or create an API credential'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRows.map((row) => (
            <CredentialCard
              key={`${row._kind}-${row.id}`}
              row={row}
              onEdit={openEditSheet}
              onDelete={handleDelete}
              onReconnect={(r) => handleConnectProvider(r.typeKey)}
            />
          ))}
        </div>
      )}

      <CredentialSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        credType={sheetCredType}
        editCredential={sheetEditCred}
        onSaved={handleCredSaved}
      />
    </div>
  )
}
