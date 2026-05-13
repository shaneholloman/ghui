import * as Atom from "effect/unstable/reactivity/Atom"
import { filterModeAtom, filterQueryAtom } from "../ui/filter/atoms.js"
import { commentsViewActiveAtom } from "../ui/comments/atoms.js"
import { detailFullViewAtom } from "../ui/detail/atoms.js"
import { diffFullViewAtom } from "../ui/diff/atoms.js"
import { selectedIssueAtom } from "../ui/issues/atoms.js"
import {
	hasMorePullRequestsAtom,
	isLoadingMorePullRequestsAtom,
	loadedPullRequestCountAtom,
	pullRequestStatusAtom,
	selectedPullRequestAtom,
	selectedRepositoryAtom,
} from "../ui/pullRequests/atoms.js"
import { workspaceSurfaceAtom } from "../workspace/atoms.js"
import { type WorkspaceSurface, workspaceSurfaceLabels } from "../workspaceSurfaces.js"

// Shared derivations that command titles / subtitles / disabledReason fields
// read from. Centralising them here means a command's data declaration stays
// short (just `disabledReason: pullRequestSurfaceReasonAtom`) and any future
// command can compose the same gating without redoing the logic.

export const activeSurfaceLabelAtom = Atom.make((get) => workspaceSurfaceLabels[get(workspaceSurfaceAtom)].toLowerCase())

// `null` when the pull request surface is active. Otherwise a sentence telling
// the user that PR commands won't run in the current surface. Used as the
// base layer for every PR-specific command's disabled chain.
export const pullRequestSurfaceReasonAtom = Atom.make((get) => (get(workspaceSurfaceAtom) === "pullRequests" ? null : "Pull request surface is not active."))

// Layered reason chains, mirroring the structure that lived in
// appCommands.ts. Each is `null` when the command can run; otherwise the
// first applicable explanation flows through.
export const noPullRequestReasonAtom = Atom.make((get): string | null => {
	const surface = get(pullRequestSurfaceReasonAtom)
	if (surface !== null) return surface
	return get(selectedPullRequestAtom) ? null : "Select a pull request first."
})

export const noOpenPullRequestReasonAtom = Atom.make((get): string | null => {
	const pr = get(selectedPullRequestAtom)
	if (pr) return pr.state === "open" ? null : "Pull request is not open."
	return get(noPullRequestReasonAtom)
})

export const noSelectedItemReasonAtom = Atom.make((get): string | null => {
	if (get(workspaceSurfaceAtom) === "issues") return get(selectedIssueAtom) ? null : "Select an issue first."
	return get(noPullRequestReasonAtom)
})

export const filterClearDisabledReasonAtom = Atom.make((get) => (get(filterQueryAtom).length > 0 || get(filterModeAtom) ? null : "No filter is active."))

export const detailCloseDisabledReasonAtom = Atom.make((get) => (get(detailFullViewAtom) ? null : "Details view is not open."))

export const diffOpenRequiredReasonAtom = Atom.make((get) => (get(diffFullViewAtom) ? null : "Open a diff first."))

export const diffCloseDisabledReasonAtom = Atom.make((get) => (get(diffFullViewAtom) ? null : "Diff view is not open."))

export const commentsViewActiveReasonAtom = Atom.make((get) => (get(commentsViewActiveAtom) ? null : "Open comments first."))

export const pullRequestRefreshTitleAtom = Atom.make((get) => (get(pullRequestStatusAtom) === "error" ? "Retry loading pull requests" : "Refresh pull requests"))

export const filterTitleAtom = Atom.make((get) => `Filter ${get(activeSurfaceLabelAtom)}`)

export const repositoryOpenSubtitleAtom = Atom.make((get) => {
	const repo = get(selectedRepositoryAtom)
	return repo ? `Current repository: ${repo}` : "Enter owner/name or a GitHub URL"
})

// Item-label derivations used as subtitles for selection-dependent commands.
export const selectedPullRequestLabelAtom = Atom.make((get) => {
	const pr = get(selectedPullRequestAtom)
	return pr ? `#${pr.number} ${pr.repository}` : "No pull request selected"
})

export const selectedIssueLabelAtom = Atom.make((get) => {
	const issue = get(selectedIssueAtom)
	return issue ? `#${issue.number} ${issue.repository}` : "No issue selected"
})

export const selectedItemLabelAtom = Atom.make((get) => (get(workspaceSurfaceAtom) === "issues" ? get(selectedIssueLabelAtom) : get(selectedPullRequestLabelAtom)))

// Workspace surface helpers — generated per surface so commands can be data.
export const workspaceSurfaceAlreadyActiveReasonAtom = (surface: WorkspaceSurface): Atom.Atom<string | null> =>
	Atom.make((get) => (get(workspaceSurfaceAtom) === surface ? "Already showing this surface." : null))

export const workspaceSurfaceSubtitleAtom = (surface: WorkspaceSurface): Atom.Atom<string> =>
	Atom.make((get) => (get(workspaceSurfaceAtom) === surface ? "Already showing this surface" : "Switch project surface"))

// Issue-only commands need a slightly different gating: only enabled when the
// issues surface is active *and* there's a selected issue.
export const issueSelectedReasonAtom = Atom.make((get) => (get(workspaceSurfaceAtom) === "issues" && get(selectedIssueAtom) ? null : "Select an issue first."))

// Whichever item is currently focused for comment-style operations: issue on
// the issues surface, PR on the PR surface, null otherwise. Used as a target
// for modal seeding (labels, new comment) without re-deriving in every command.
export const selectedCommentSubjectAtom = Atom.make((get) => {
	const surface = get(workspaceSurfaceAtom)
	if (surface === "issues") return get(selectedIssueAtom)
	if (surface === "pullRequests") return get(selectedPullRequestAtom)
	return null
})

// Load-more gating: enabled only when we're on the PR surface, there are more
// pages, and a fetch isn't already in flight.
export const loadMoreDisabledReasonAtom = Atom.make((get) => {
	const surface = get(pullRequestSurfaceReasonAtom)
	if (surface !== null) return surface
	if (get(isLoadingMorePullRequestsAtom)) return "Already loading more pull requests."
	if (!get(hasMorePullRequestsAtom)) return "No more pull requests loaded by this view."
	return null
})

export const loadMoreSubtitleAtom = Atom.make((get) => `${get(loadedPullRequestCountAtom)} loaded`)
