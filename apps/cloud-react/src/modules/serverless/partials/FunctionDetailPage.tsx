import { useMemo } from "react"

import {
  FUNCTION_DETAIL_TABS,
  FunctionDetailPage,
  registerMonacoSetup,
  type FunctionDetailPageProps,
  type FunctionDetailTabValue,
} from "@datadack/serverless"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"

import { useActiveRegion } from "@/modules/region/region.context"
import { useScreen } from "@/services/api/screen"

import { SERVERLESS_ROUTES } from "../serverless.constants"
import { SERVERLESS_QUERY_KEYS } from "../serverless.hooks"

// Points the Code tab's editor at this app's bundled Monaco rather than the
// wrapper's CDN loader. A thunk, not a static import, so Monaco is split into
// its own chunk and fetched only when someone opens a file. The package awaits
// this immediately before mounting the editor.
registerMonacoSetup(() => import("@/lib/monaco-setup"))

// Thin wrapper over the shared @datadack/serverless detail page. Everything
// app-specific stays here — the route param, the ?tab= URL state, navigation
// and the i18n-built labels — while the tabs, testers and dialogs live in the
// package (one implementation for both consoles). Data flows through the
// transport mounted by ServerlessDataProvider (direct FaaS reads).

const DEFAULT_TAB: FunctionDetailTabValue = "code"

export function ServerlessFunctionDetailPage() {
  useScreen("serverless.function-detail")
  const { t } = useTranslation()
  const { name = "" } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { activeRegionCode } = useActiveRegion()
  const [searchParams, setSearchParams] = useSearchParams()

  // ?tab= is the app's URL state; unknown values fall back to the default and
  // the default itself keeps the URL clean (no ?tab=code).
  const requestedTab = searchParams.get("tab") ?? DEFAULT_TAB
  const activeTab = FUNCTION_DETAIL_TABS.some((tab) => tab.value === requestedTab)
    ? (requestedTab as FunctionDetailTabValue)
    : DEFAULT_TAB

  const setTab = (tab: FunctionDetailTabValue) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (tab === DEFAULT_TAB) next.delete("tab")
        else next.set("tab", tab)
        return next
      },
      { replace: true },
    )
  }

  // The full label tree for the shared page: tab names reuse the existing
  // serverless.tabs.* keys, everything else lives under serverless.detail.*
  // (mirrored in en.json and hi.json). Interpolated leaves are functions so
  // the package can inject the runtime value through t(key, { name }).
  const labels = useMemo<FunctionDetailPageProps["labels"]>(
    () => ({
      backLabel: t("serverless.detail.backLabel"),
      tabs: {
        code: t("serverless.tabs.code"),
        test: t("serverless.tabs.test"),
        monitor: t("serverless.tabs.monitor"),
        configuration: t("serverless.tabs.configuration"),
        aliases: t("serverless.tabs.aliases"),
        versions: t("serverless.tabs.versions"),
      },
      notFound: {
        title: (fn: string) => t("serverless.detail.notFound.title", { name: fn }),
        description: t("serverless.detail.notFound.description"),
      },
      unavailable: {
        title: t("serverless.detail.unavailable.title"),
        description: t("serverless.detail.unavailable.description"),
      },
      code: {
        title: t("serverless.detail.code.title"),
        message: t("serverless.detail.code.message"),
        toolbar: {
          save: t("serverless.detail.code.toolbar.save"),
          saving: t("serverless.detail.code.toolbar.saving"),
          deploy: t("serverless.detail.code.toolbar.deploy"),
          deploying: t("serverless.detail.code.toolbar.deploying"),
          discard: t("serverless.detail.code.toolbar.discard"),
          draft: t("serverless.detail.code.toolbar.draft"),
          draftSince: (relative: string) =>
            t("serverless.detail.code.toolbar.draftSince", { relative }),
          deployed: t("serverless.detail.code.toolbar.deployed"),
          // Pluralised here rather than through i18next's count suffixes, so
          // the two forms are explicit keys a translator can see and fill.
          unsaved: (count: number) =>
            t(
              count === 1
                ? "serverless.detail.code.toolbar.unsavedOne"
                : "serverless.detail.code.toolbar.unsavedOther",
              { count },
            ),
          readOnly: t("serverless.detail.code.toolbar.readOnly"),
          close: t("serverless.detail.code.toolbar.close"),
        },
        tree: {
          heading: t("serverless.detail.code.tree.heading"),
          filter: t("serverless.detail.code.tree.filter"),
          newFile: t("serverless.detail.code.tree.newFile"),
          newFolder: t("serverless.detail.code.tree.newFolder"),
          rename: t("serverless.detail.code.tree.rename"),
          delete: t("serverless.detail.code.tree.delete"),
          binary: t("serverless.detail.code.tree.binary"),
          empty: t("serverless.detail.code.tree.empty"),
          noMatches: t("serverless.detail.code.tree.noMatches"),
        },
        dialogs: {
          cancel: t("serverless.detail.code.dialogs.cancel"),
          newFile: {
            title: t("serverless.detail.code.dialogs.newFile.title"),
            label: t("serverless.detail.code.dialogs.newFile.label"),
            placeholder: t("serverless.detail.code.dialogs.newFile.placeholder"),
            confirm: t("serverless.detail.code.dialogs.newFile.confirm"),
          },
          newFolder: {
            title: t("serverless.detail.code.dialogs.newFolder.title"),
            label: t("serverless.detail.code.dialogs.newFolder.label"),
            hint: t("serverless.detail.code.dialogs.newFolder.hint"),
            confirm: t("serverless.detail.code.dialogs.newFolder.confirm"),
          },
          rename: {
            title: t("serverless.detail.code.dialogs.rename.title"),
            label: t("serverless.detail.code.dialogs.rename.label"),
            confirm: t("serverless.detail.code.dialogs.rename.confirm"),
          },
          deleteFile: {
            title: (path: string) =>
              t("serverless.detail.code.dialogs.deleteFile.title", { path }),
            description: t("serverless.detail.code.dialogs.deleteFile.description"),
            confirm: t("serverless.detail.code.dialogs.deleteFile.confirm"),
          },
          discard: {
            title: t("serverless.detail.code.dialogs.discard.title"),
            description: t("serverless.detail.code.dialogs.discard.description"),
            confirm: t("serverless.detail.code.dialogs.discard.confirm"),
          },
          stale: {
            title: t("serverless.detail.code.dialogs.stale.title"),
            description: t("serverless.detail.code.dialogs.stale.description"),
            reload: t("serverless.detail.code.dialogs.stale.reload"),
            overwrite: t("serverless.detail.code.dialogs.stale.overwrite"),
          },
        },
        status: {
          position: (line: number, column: number) =>
            t("serverless.detail.code.status.position", { line, column }),
          encoding: t("serverless.detail.code.status.encoding"),
          readOnly: t("serverless.detail.code.status.readOnly"),
        },
        binaryFile: t("serverless.detail.code.binaryFile"),
        noFileOpen: t("serverless.detail.code.noFileOpen"),
        notEditable: {
          title: t("serverless.detail.code.notEditable.title"),
          ImagePackage: t("serverless.detail.code.notEditable.ImagePackage"),
          NoCodeArtifact: t("serverless.detail.code.notEditable.NoCodeArtifact"),
          ArchiveMissing: t("serverless.detail.code.notEditable.ArchiveMissing"),
          PackageTooLarge: (limit: string) =>
            t("serverless.detail.code.notEditable.PackageTooLarge", { limit }),
          NotAZipArchive: t("serverless.detail.code.notEditable.NotAZipArchive"),
          unknown: t("serverless.detail.code.notEditable.unknown"),
        },
        errors: {
          loadFailed: t("serverless.detail.code.errors.loadFailed"),
          openFailed: t("serverless.detail.code.errors.openFailed"),
          saveFailed: t("serverless.detail.code.errors.saveFailed"),
          createFailed: t("serverless.detail.code.errors.createFailed"),
          renameFailed: t("serverless.detail.code.errors.renameFailed"),
          deleteFailed: t("serverless.detail.code.errors.deleteFailed"),
          discardFailed: t("serverless.detail.code.errors.discardFailed"),
          deployFailed: t("serverless.detail.code.errors.deployFailed"),
          fileTooLarge: (limit: string) =>
            t("serverless.detail.code.errors.fileTooLarge", { limit }),
          nothingToDeploy: t("serverless.detail.code.errors.nothingToDeploy"),
          duplicatePath: t("serverless.detail.code.errors.duplicatePath"),
          invalidPath: t("serverless.detail.code.errors.invalidPath"),
        },
        toasts: {
          saved: (path: string) => t("serverless.detail.code.toasts.saved", { path }),
          savedAll: (count: number) => t("serverless.detail.code.toasts.savedAll", { count }),
          created: (path: string) => t("serverless.detail.code.toasts.created", { path }),
          renamed: (path: string) => t("serverless.detail.code.toasts.renamed", { path }),
          deleted: (path: string) => t("serverless.detail.code.toasts.deleted", { path }),
          discarded: t("serverless.detail.code.toasts.discarded"),
          deployed: (version: string) =>
            t("serverless.detail.code.toasts.deployed", { version }),
        },
      },
      actions: { delete: t("serverless.detail.actions.delete") },
      deleteConfirm: {
        title: (fn: string) => t("serverless.detail.deleteConfirm.title", { name: fn }),
        description: t("serverless.detail.deleteConfirm.description"),
        confirmLabel: t("serverless.detail.deleteConfirm.confirmLabel"),
        cancelLabel: t("serverless.detail.deleteConfirm.cancelLabel"),
        typeToConfirm: t("serverless.detail.deleteConfirm.typeToConfirm"),
        success: (fn: string) => t("serverless.detail.deleteConfirm.success", { name: fn }),
      },
      test: {
        payload: t("serverless.detail.test.payload"),
        template: t("serverless.detail.test.template"),
        run: t("serverless.detail.test.run"),
        running: t("serverless.detail.test.running"),
        response: t("serverless.detail.test.response"),
        hint: t("serverless.detail.test.hint"),
        empty: t("serverless.detail.test.empty"),
        invalidJson: t("serverless.detail.test.invalidJson"),
        executedVersion: t("serverless.detail.test.executedVersion"),
        logs: t("serverless.detail.test.logs"),
        failed: t("serverless.detail.test.failed"),
      },
      monitor: {
        blurb: t("serverless.detail.monitor.blurb"),
        comingSoon: t("serverless.detail.monitor.comingSoon"),
        metrics: {
          invocations: {
            title: t("serverless.detail.monitor.metrics.invocations.title"),
            unit: t("serverless.detail.monitor.metrics.invocations.unit"),
          },
          duration: {
            title: t("serverless.detail.monitor.metrics.duration.title"),
            unit: t("serverless.detail.monitor.metrics.duration.unit"),
          },
          errors: {
            title: t("serverless.detail.monitor.metrics.errors.title"),
            unit: t("serverless.detail.monitor.metrics.errors.unit"),
          },
          throttles: {
            title: t("serverless.detail.monitor.metrics.throttles.title"),
            unit: t("serverless.detail.monitor.metrics.throttles.unit"),
          },
          concurrent: {
            title: t("serverless.detail.monitor.metrics.concurrent.title"),
            unit: t("serverless.detail.monitor.metrics.concurrent.unit"),
          },
          recursive: {
            title: t("serverless.detail.monitor.metrics.recursive.title"),
            unit: t("serverless.detail.monitor.metrics.recursive.unit"),
          },
          asyncEventAge: {
            title: t("serverless.detail.monitor.metrics.asyncEventAge.title"),
            unit: t("serverless.detail.monitor.metrics.asyncEventAge.unit"),
          },
          asyncEvents: {
            title: t("serverless.detail.monitor.metrics.asyncEvents.title"),
            unit: t("serverless.detail.monitor.metrics.asyncEvents.unit"),
          },
          asyncFailures: {
            title: t("serverless.detail.monitor.metrics.asyncFailures.title"),
            unit: t("serverless.detail.monitor.metrics.asyncFailures.unit"),
          },
          iteratorAge: {
            title: t("serverless.detail.monitor.metrics.iteratorAge.title"),
            unit: t("serverless.detail.monitor.metrics.iteratorAge.unit"),
          },
        },
      },
      configuration: {
        nav: {
          general: t("serverless.detail.configuration.nav.general"),
          env: t("serverless.detail.configuration.nav.env"),
          triggers: t("serverless.detail.configuration.nav.triggers"),
          tags: t("serverless.detail.configuration.nav.tags"),
          concurrency: t("serverless.detail.configuration.nav.concurrency"),
          async: t("serverless.detail.configuration.nav.async"),
          functionUrl: t("serverless.detail.configuration.nav.functionUrl"),
          permissions: t("serverless.detail.configuration.nav.permissions"),
          vpc: t("serverless.detail.configuration.nav.vpc"),
        },
        soon: t("serverless.detail.configuration.soon"),
        edit: t("serverless.detail.configuration.edit"),
        save: t("serverless.detail.configuration.save"),
        cancel: t("serverless.detail.configuration.cancel"),
        saved: t("serverless.detail.configuration.saved"),
        fields: {
          description: t("serverless.detail.configuration.fields.description"),
          runtime: t("serverless.detail.configuration.fields.runtime"),
          handler: t("serverless.detail.configuration.fields.handler"),
          architecture: t("serverless.detail.configuration.fields.architecture"),
          memory: t("serverless.detail.configuration.fields.memory"),
          timeout: t("serverless.detail.configuration.fields.timeout"),
          ephemeral: t("serverless.detail.configuration.fields.ephemeral"),
          packageType: t("serverless.detail.configuration.fields.packageType"),
          resourceGroupId: t("serverless.detail.configuration.fields.resourceGroupId"),
          region: t("serverless.detail.configuration.fields.region"),
          lastModified: t("serverless.detail.configuration.fields.lastModified"),
          imageUri: t("serverless.detail.configuration.fields.imageUri"),
          reserved: t("serverless.detail.configuration.fields.reserved"),
          provisioned: t("serverless.detail.configuration.fields.provisioned"),
          maxEventAge: t("serverless.detail.configuration.fields.maxEventAge"),
          retryAttempts: t("serverless.detail.configuration.fields.retryAttempts"),
        },
        envEmpty: t("serverless.detail.configuration.envEmpty"),
        envHint: t("serverless.detail.configuration.envHint"),
        envAdd: t("serverless.detail.configuration.envAdd"),
        envRemove: (key: string) =>
          key
            ? t("serverless.detail.configuration.envRemove", { name: key })
            : t("serverless.detail.configuration.envRemoveUnnamed"),
        tagsEmpty: t("serverless.detail.configuration.tagsEmpty"),
        tagsHint: t("serverless.detail.configuration.tagsHint"),
        triggersEmpty: t("serverless.detail.configuration.triggersEmpty"),
        unreserved: t("serverless.detail.configuration.unreserved"),
        comingSoon: {
          functionUrl: {
            title: t("serverless.detail.configuration.comingSoon.functionUrl.title"),
            message: t("serverless.detail.configuration.comingSoon.functionUrl.message"),
          },
          permissions: {
            title: t("serverless.detail.configuration.comingSoon.permissions.title"),
            message: t("serverless.detail.configuration.comingSoon.permissions.message"),
          },
          vpc: {
            title: t("serverless.detail.configuration.comingSoon.vpc.title"),
            message: t("serverless.detail.configuration.comingSoon.vpc.message"),
          },
        },
      },
      versions: {
        columns: {
          version: t("serverless.detail.versions.columns.version"),
          description: t("serverless.detail.versions.columns.description"),
          date: t("serverless.detail.versions.columns.date"),
          codeSize: t("serverless.detail.versions.columns.codeSize"),
          sha: t("serverless.detail.versions.columns.sha"),
        },
        empty: t("serverless.detail.versions.empty"),
        createAlias: t("serverless.detail.versions.createAlias"),
        rowActions: t("serverless.detail.versions.rowActions"),
      },
      aliases: {
        columns: {
          name: t("serverless.detail.aliases.columns.name"),
          version: t("serverless.detail.aliases.columns.version"),
          routing: t("serverless.detail.aliases.columns.routing"),
          description: t("serverless.detail.aliases.columns.description"),
        },
        empty: t("serverless.detail.aliases.empty"),
        emptyHint: t("serverless.detail.aliases.emptyHint"),
        create: t("serverless.detail.aliases.create"),
        edit: t("serverless.detail.aliases.edit"),
        save: t("serverless.detail.aliases.save"),
        namePlaceholder: t("serverless.detail.aliases.namePlaceholder"),
        weighted: t("serverless.detail.aliases.weighted"),
        weight: t("serverless.detail.aliases.weight"),
        version: t("serverless.detail.aliases.version"),
        description: t("serverless.detail.aliases.description"),
        deleteTitle: (alias: string) =>
          t("serverless.detail.aliases.deleteTitle", { name: alias }),
        deleteDescription: t("serverless.detail.aliases.deleteDescription"),
        saved: (alias: string) => t("serverless.detail.aliases.saved", { name: alias }),
        deleted: (alias: string) => t("serverless.detail.aliases.deleted", { name: alias }),
        rowActions: t("serverless.detail.aliases.rowActions"),
        sameVersion: t("serverless.detail.aliases.sameVersion"),
        nameRequired: t("serverless.detail.aliases.nameRequired"),
        versionRequired: t("serverless.detail.aliases.versionRequired"),
        weightRange: t("serverless.detail.aliases.weightRange"),
      },
      errors: {
        saveFailed: t("serverless.detail.errors.saveFailed"),
        deleteFailed: t("serverless.detail.errors.deleteFailed"),
        invokeFailed: t("serverless.detail.errors.invokeFailed"),
        loadFailed: t("serverless.detail.errors.loadFailed"),
      },
    }),
    [t],
  )

  const goToList = () => void navigate(SERVERLESS_ROUTES.ROOT)

  // The package's delete hook only invalidates its own ["datadack-serverless"]
  // keys; the functions list page still reads the app-side gateway cache
  // (SERVERLESS_QUERY_KEYS, 60s staleTime), so without this sweep the deleted
  // row ghosts in the list until that cache goes stale on its own.
  const handleDeleted = () => {
    void queryClient.invalidateQueries({
      queryKey: SERVERLESS_QUERY_KEYS.functions(activeRegionCode),
    })
    goToList()
  }

  return (
    <FunctionDetailPage
      name={name}
      scope={activeRegionCode ?? "default"}
      activeTab={activeTab}
      onTabChange={setTab}
      onBack={goToList}
      onDeleted={handleDeleted}
      labels={labels}
    />
  )
}
