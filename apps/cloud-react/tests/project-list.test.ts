import { describe, expect, test } from "bun:test"

import {
	buildProjectEntries,
	matchesProjectSearch,
	projectListView,
	sortProjectEntries,
	stateChips,
} from "@/modules/managed-apps/partials/overview/project-list"
import type { DeployState, Project, SetupState } from "@/modules/managed-apps/managed-apps.types"

/** A project with only the fields the list model reads, and honest defaults. */
function project(overrides: Partial<Project> & { id: string }): Project {
	return {
		name: overrides.id,
		subdomain: `${overrides.id}-abc`,
		url: `https://${overrides.id}.apps.example.cloud`,
		project_type: "react",
		plan: "basic",
		installation_id: 1,
		repo_owner: "acme",
		repo_name: overrides.id,
		repo_id: 1,
		branch: "main",
		root_dir: "",
		install_command: "",
		build_command: "",
		output_dir: "",
		status: "active",
		deploy_state: "awaiting_build" as DeployState,
		setup_state: "merged" as SetupState,
		setup_pr_number: 0,
		setup_pr_url: "",
		setup_branch: "",
		setup_error: "",
		workflow_version: 1,
		vpc_id: null,
		subnet_id: null,
		active_build_id: null,
		proxmox_ct_id: 0,
		pve_node_id: null,
		container_ip: "",
		last_error: "",
		created_at: "2026-01-01T00:00:00Z",
		updated_at: "2026-01-01T00:00:00Z",
		...overrides,
	}
}

const entries = buildProjectEntries(
	[
		project({ id: "healthy", deploy_state: "built_pending_deploy" }),
		project({ id: "broken", deploy_state: "failed", last_error: "build blew up" }),
		project({ id: "waiting", deploy_state: "awaiting_setup", setup_state: "pr_open" }),
	],
	new Map()
)

describe("sortProjectEntries", () => {
	test("urgency puts what needs a human first", () => {
		// The whole point of the default order: the project someone opened this
		// page for should not be below three healthy ones.
		expect(sortProjectEntries(entries, "urgency").map((e) => e.project.id)).toEqual([
			"broken",
			"waiting",
			"healthy",
		])
	})

	test("name sorts alphabetically", () => {
		expect(sortProjectEntries(entries, "name").map((e) => e.project.id)).toEqual([
			"broken",
			"healthy",
			"waiting",
		])
	})

	test("updated sorts newest first, and an unparseable stamp sorts last", () => {
		const mixed = buildProjectEntries(
			[
				project({ id: "old", updated_at: "2026-01-01T00:00:00Z" }),
				project({ id: "new", updated_at: "2026-06-01T00:00:00Z" }),
				project({ id: "broken-stamp", updated_at: "" }),
			],
			new Map()
		)
		expect(sortProjectEntries(mixed, "updated").map((e) => e.project.id)).toEqual([
			"new",
			"old",
			"broken-stamp",
		])
	})

	test("does not mutate its input", () => {
		// The array comes from the query cache; sorting it in place would reorder
		// every other consumer's copy.
		const before = entries.map((e) => e.project.id)
		sortProjectEntries(entries, "name")
		expect(entries.map((e) => e.project.id)).toEqual(before)
	})
})

describe("matchesProjectSearch", () => {
	const entry = entries[0]

	test("matches the derived state label, not the row's status column", () => {
		// `project.status` is "active" for every project alive, so searching for a
		// state through it would match everything equally.
		const failed = entries[1]
		expect(matchesProjectSearch(failed, "failed")).toBe(true)
		expect(matchesProjectSearch(failed, "active")).toBe(false)
	})

	test("matches name, repo and address", () => {
		expect(matchesProjectSearch(entry, "healthy")).toBe(true)
		expect(matchesProjectSearch(entry, "acme")).toBe(true)
		expect(matchesProjectSearch(entry, "apps.example.cloud")).toBe(true)
		expect(matchesProjectSearch(entry, "nothing-like-this")).toBe(false)
	})

	test("an empty needle matches everything", () => {
		expect(matchesProjectSearch(entry, "")).toBe(true)
	})
})

describe("stateChips", () => {
	test("one chip per state present, most urgent first, never a zero", () => {
		const chips = stateChips(entries)
		expect(chips.map((c) => c.kind)).toEqual([
			"failed",
			"awaiting_setup",
			"built_pending_deploy",
		])
		expect(chips.every((c) => c.count > 0)).toBe(true)
	})

	test("counts group projects sharing a state", () => {
		const many = buildProjectEntries(
			[
				project({ id: "a", deploy_state: "failed" }),
				project({ id: "b", deploy_state: "failed" }),
			],
			new Map()
		)
		expect(stateChips(many)).toHaveLength(1)
		expect(stateChips(many)[0]?.count).toBe(2)
	})
})

describe("projectListView", () => {
	test("chips are counted before search, so typing cannot make them vanish", () => {
		const view = projectListView(entries, { search: "broken", state: "all", sort: "urgency" })
		expect(view.visible.map((e) => e.project.id)).toEqual(["broken"])
		// All three chips survive a search that matched one project.
		expect(view.chips).toHaveLength(3)
		expect(view.filtersActive).toBe(true)
	})

	test("the state filter narrows without hiding the other chips", () => {
		const view = projectListView(entries, { search: "", state: "failed", sort: "urgency" })
		expect(view.visible.map((e) => e.project.id)).toEqual(["broken"])
		expect(view.chips).toHaveLength(3)
	})

	test("search and state compose", () => {
		expect(
			projectListView(entries, { search: "broken", state: "awaiting_setup", sort: "urgency" })
				.visible
		).toEqual([])
	})

	test("no filters means nothing is reported as filtered", () => {
		const view = projectListView(entries, { search: "  ", state: "all", sort: "urgency" })
		expect(view.visible).toHaveLength(3)
		expect(view.filtersActive).toBe(false)
	})
})
