import { Effect } from "effect"
import * as Atom from "effect/unstable/reactivity/Atom"
import { BrowserOpener } from "../services/BrowserOpener.js"
import { Clipboard } from "../services/Clipboard.js"
import { commentsViewActiveAtom } from "../ui/comments/atoms.js"
import { detailFullViewAtom, detailScrollOffsetAtom } from "../ui/detail/atoms.js"
import { diffCommentRangeStartIndexAtom, diffFullViewAtom } from "../ui/diff/atoms.js"
import { filterDraftAtom, filterModeAtom, filterQueryAtom } from "../ui/filter/atoms.js"
import { selectedIssueAtom } from "../ui/issues/atoms.js"
import { selectedIssueIndexAtom } from "../ui/listSelection/atoms.js"
import { activeModalAtom } from "../ui/modals/atoms.js"
import { initialCommandPaletteState, initialOpenRepositoryModalState, Modal } from "../ui/modals/types.js"
import { noticeAtom } from "../ui/notice/atoms.js"
import { selectedPullRequestAtom, selectedRepositoryAtom } from "../ui/pullRequests/atoms.js"
import { workspaceSurfaceAtom, workspaceTabSurfacesAtom } from "../workspace/atoms.js"
import { type WorkspaceSurface, workspaceSurfaceLabels, workspaceSurfaces } from "../workspaceSurfaces.js"
import {
	detailCloseDisabledReasonAtom,
	diffCloseDisabledReasonAtom,
	filterClearDisabledReasonAtom,
	filterTitleAtom,
	issueSelectedReasonAtom,
	noOpenPullRequestReasonAtom,
	noPullRequestReasonAtom,
	noSelectedItemReasonAtom,
	repositoryOpenSubtitleAtom,
	selectedIssueLabelAtom,
	selectedItemLabelAtom,
	selectedPullRequestLabelAtom,
	workspaceSurfaceAlreadyActiveReasonAtom,
	workspaceSurfaceSubtitleAtom,
} from "./derivations.js"
import { defineCommand, type CommandDefinition } from "./registry.js"

// Most commands fall into one of three shapes:
//   1. "Open this modal": yield* Atom.set(activeModalAtom, Modal.X(...))
//   2. "Toggle this atom": yield* Atom.update(atom, …)
//   3. "Read selection, do thing with service": Effect.gen reading selection
//      via Atom.get and calling Clipboard.use / BrowserOpener.use / ...
//
// Everything is dispatchable by id and depends only on atoms — no closures
// over component-local state.

const workspaceSurfaceCommands = workspaceSurfaces.map((surface, index): CommandDefinition => {
	const subtitleAtom = workspaceSurfaceSubtitleAtom(surface)
	const disabledAtom = workspaceSurfaceAlreadyActiveReasonAtom(surface)
	return defineCommand({
		id: `workspace.${surface}`,
		title: `Show ${workspaceSurfaceLabels[surface]}`,
		scope: "View",
		subtitle: subtitleAtom,
		shortcut: `${index + 1}`,
		keywords: [workspaceSurfaceLabels[surface], "workspace", "surface", "tab"],
		disabledReason: disabledAtom,
		run: switchWorkspaceSurfaceEffect(surface),
	})
})

function switchWorkspaceSurfaceEffect(surface: WorkspaceSurface) {
	return Effect.gen(function* () {
		const allowed = yield* Atom.get(workspaceTabSurfacesAtom)
		if (!allowed.includes(surface)) return
		const current = yield* Atom.get(workspaceSurfaceAtom)
		if (current === surface) return
		yield* Atom.set(workspaceSurfaceAtom, surface)
		yield* Atom.set(selectedIssueIndexAtom, 0)
		yield* Atom.set(detailFullViewAtom, false)
		yield* Atom.set(diffFullViewAtom, false)
		yield* Atom.set(commentsViewActiveAtom, false)
		yield* Atom.set(diffCommentRangeStartIndexAtom, null)
		yield* Atom.set(filterModeAtom, false)
		const query = yield* Atom.get(filterQueryAtom)
		yield* Atom.set(filterDraftAtom, query)
		yield* Atom.set(noticeAtom, null)
	})
}

const flashErrorEffect = (error: unknown) =>
	Effect.gen(function* () {
		const message = error instanceof Error ? error.message : String(error)
		yield* Atom.set(noticeAtom, message)
	})

export const globalCommands: readonly CommandDefinition[] = [
	defineCommand({
		id: "command.open",
		title: "Open command palette",
		scope: "Global",
		subtitle: "Search every available route through ghui",
		shortcut: "ctrl-p/cmd-k/?",
		keywords: ["palette", "commands", "deck", "help", "keys", "keyboard", "shortcuts"],
		run: Atom.set(activeModalAtom, Modal.CommandPalette(initialCommandPaletteState)),
	}),
	defineCommand({
		id: "filter.open",
		title: filterTitleAtom,
		scope: "Global",
		subtitle: "Search the visible surface",
		shortcut: "/",
		keywords: ["search"],
		run: Effect.gen(function* () {
			const query = yield* Atom.get(filterQueryAtom)
			yield* Atom.set(filterDraftAtom, query)
			yield* Atom.set(filterModeAtom, true)
		}),
	}),
	defineCommand({
		id: "filter.clear",
		title: "Clear filter",
		scope: "Global",
		subtitle: "Show every item in the current surface",
		shortcut: "esc",
		disabledReason: filterClearDisabledReasonAtom,
		run: Effect.gen(function* () {
			yield* Atom.set(filterQueryAtom, "")
			yield* Atom.set(filterDraftAtom, "")
			yield* Atom.set(filterModeAtom, false)
		}),
	}),

	// === Workspace surface switches ===
	...workspaceSurfaceCommands,

	// === Detail / diff toggles ===
	defineCommand({
		id: "detail.open",
		title: "Open details",
		scope: "View",
		subtitle: selectedItemLabelAtom,
		shortcut: "enter",
		disabledReason: noSelectedItemReasonAtom,
		run: Effect.gen(function* () {
			yield* Atom.set(detailFullViewAtom, true)
			yield* Atom.set(detailScrollOffsetAtom, 0)
		}),
	}),
	defineCommand({
		id: "detail.close",
		title: "Close details view",
		scope: "Pull request",
		subtitle: "Return to the queue",
		shortcut: "esc",
		disabledReason: detailCloseDisabledReasonAtom,
		run: Effect.gen(function* () {
			yield* Atom.set(detailFullViewAtom, false)
			yield* Atom.set(detailScrollOffsetAtom, 0)
		}),
	}),
	defineCommand({
		id: "diff.close",
		title: "Close diff view",
		scope: "Diff",
		subtitle: "Return to the queue or detail view",
		shortcut: "esc",
		disabledReason: diffCloseDisabledReasonAtom,
		run: Effect.gen(function* () {
			yield* Atom.set(diffFullViewAtom, false)
			yield* Atom.set(diffCommentRangeStartIndexAtom, null)
		}),
	}),
	// === Modal openers (selection-seeded) ===
	defineCommand({
		id: "repository.open",
		title: "Open repository...",
		scope: "View",
		subtitle: repositoryOpenSubtitleAtom,
		keywords: ["repo", "repository", "owner", "github"],
		run: Effect.gen(function* () {
			const repository = yield* Atom.get(selectedRepositoryAtom)
			yield* Atom.set(activeModalAtom, Modal.OpenRepository({ ...initialOpenRepositoryModalState, query: repository ?? "" }))
		}),
	}),
	defineCommand({
		id: "pull.close",
		title: "Close pull request",
		scope: "Pull request",
		subtitle: selectedPullRequestLabelAtom,
		shortcut: "x",
		disabledReason: noOpenPullRequestReasonAtom,
		run: Effect.gen(function* () {
			const pr = yield* Atom.get(selectedPullRequestAtom)
			if (!pr || pr.state !== "open") return
			yield* Atom.set(
				activeModalAtom,
				Modal.Close({
					kind: "pullRequest",
					repository: pr.repository,
					number: pr.number,
					title: pr.title,
					url: pr.url,
					running: false,
					error: null,
				}),
			)
		}),
	}),
	defineCommand({
		id: "issue.close",
		title: "Close issue",
		scope: "Issue",
		subtitle: selectedIssueLabelAtom,
		shortcut: "x",
		keywords: ["close", "resolve"],
		disabledReason: issueSelectedReasonAtom,
		run: Effect.gen(function* () {
			const issue = yield* Atom.get(selectedIssueAtom)
			if (!issue) return
			yield* Atom.set(
				activeModalAtom,
				Modal.Close({
					kind: "issue",
					repository: issue.repository,
					number: issue.number,
					title: issue.title,
					url: issue.url,
					running: false,
					error: null,
				}),
			)
		}),
	}),

	// === System / system-service commands ===
	defineCommand({
		id: "pull.open-browser",
		title: "Open pull request in browser",
		scope: "Pull request",
		subtitle: selectedPullRequestLabelAtom,
		shortcut: "o",
		keywords: ["github", "web"],
		disabledReason: noPullRequestReasonAtom,
		run: Effect.gen(function* () {
			const pr = yield* Atom.get(selectedPullRequestAtom)
			if (!pr) return
			yield* BrowserOpener.use((opener) => opener.openPullRequest(pr)).pipe(Effect.catch(flashErrorEffect))
		}),
	}),
	defineCommand({
		id: "pull.copy-metadata",
		title: "Copy pull request metadata",
		scope: "Pull request",
		subtitle: selectedPullRequestLabelAtom,
		shortcut: "y",
		keywords: ["clipboard", "url", "title"],
		disabledReason: noPullRequestReasonAtom,
		run: Effect.gen(function* () {
			const pr = yield* Atom.get(selectedPullRequestAtom)
			if (!pr) return
			const text = `${pr.repository}#${pr.number} ${pr.title}\n${pr.url}`
			yield* Clipboard.use((clipboard) => clipboard.copy(text)).pipe(
				Effect.tap(() => Atom.set(noticeAtom, "Pull request metadata copied")),
				Effect.catch(flashErrorEffect),
			)
		}),
	}),
	defineCommand({
		id: "issue.copy-metadata",
		title: "Copy issue metadata",
		scope: "Comments",
		subtitle: selectedIssueLabelAtom,
		shortcut: "y",
		keywords: ["clipboard", "url", "title"],
		disabledReason: issueSelectedReasonAtom,
		run: Effect.gen(function* () {
			const issue = yield* Atom.get(selectedIssueAtom)
			if (!issue) return
			const text = `${issue.repository}#${issue.number} ${issue.title}\n${issue.url}`
			yield* Clipboard.use((clipboard) => clipboard.copy(text)).pipe(
				Effect.tap(() => Atom.set(noticeAtom, "Issue metadata copied")),
				Effect.catch(flashErrorEffect),
			)
		}),
	}),
]
