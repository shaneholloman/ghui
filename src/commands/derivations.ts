import * as Atom from "effect/unstable/reactivity/Atom"
import { filterModeAtom, filterQueryAtom } from "../ui/filter/atoms.js"
import { pullRequestStatusAtom, selectedRepositoryAtom } from "../ui/pullRequests/atoms.js"
import { workspaceSurfaceAtom } from "../workspace/atoms.js"
import { workspaceSurfaceLabels } from "../workspaceSurfaces.js"

// Shared derivations that command titles / subtitles / disabledReason fields
// read from. Centralising them here means a command's data declaration stays
// short (just `disabledReason: pullRequestSurfaceReasonAtom`) and any future
// command can compose the same gating without redoing the logic.

export const activeSurfaceLabelAtom = Atom.make((get) => workspaceSurfaceLabels[get(workspaceSurfaceAtom)].toLowerCase())

// `null` when the pull request surface is active. Otherwise a sentence telling
// the user that PR commands won't run in the current surface. Used as the
// base layer for every PR-specific command's disabled chain.
export const pullRequestSurfaceReasonAtom = Atom.make((get) => (get(workspaceSurfaceAtom) === "pullRequests" ? null : "Pull request surface is not active."))

export const filterClearDisabledReasonAtom = Atom.make((get) => (get(filterQueryAtom).length > 0 || get(filterModeAtom) ? null : "No filter is active."))

export const pullRequestRefreshTitleAtom = Atom.make((get) => (get(pullRequestStatusAtom) === "error" ? "Retry loading pull requests" : "Refresh pull requests"))

export const filterTitleAtom = Atom.make((get) => `Filter ${get(activeSurfaceLabelAtom)}`)

export const repositoryOpenSubtitleAtom = Atom.make((get) => {
	const repo = get(selectedRepositoryAtom)
	return repo ? `Current repository: ${repo}` : "Enter owner/name or a GitHub URL"
})
