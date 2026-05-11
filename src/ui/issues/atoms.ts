import { Effect } from "effect"
import * as Atom from "effect/unstable/reactivity/Atom"
import type { IssueItem } from "../../domain.js"
import { type IssueListMode, type IssueQuery, issueQueryToListInput } from "../../item.js"
import { GitHubService } from "../../services/GitHubService.js"
import { detectedRepository, githubRuntime, pullRequestPageSize } from "../../services/runtime.js"

// User-facing issue view. Mirrors `PullRequestView` but with issue-only modes.
//
// `Repository` is "all issues in this repo" — same semantics as PR's
// repository view. `Queue` carries the people qualifier (authored/assigned/
// mentioned). Globally we default to `authored`.
export type IssueView =
	| { readonly _tag: "Repository"; readonly repository: string }
	| { readonly _tag: "Queue"; readonly mode: Exclude<IssueListMode, "all">; readonly repository: string | null }

export const initialIssueView = (repository: string | null = null): IssueView =>
	repository ? { _tag: "Repository", repository } : { _tag: "Queue", mode: "authored", repository: null }

export const issueViewMode = (view: IssueView): IssueListMode => (view._tag === "Repository" ? "all" : view.mode)
export const issueViewRepository = (view: IssueView) => view.repository
export const issueViewToQuery = (view: IssueView): IssueQuery => ({ mode: issueViewMode(view), repository: issueViewRepository(view), textFilter: "" })

export const activeIssueViewAtom = Atom.make<IssueView>(initialIssueView(detectedRepository)).pipe(Atom.keepAlive)

// The `(get)` parameter makes this atom reactive on the active issue view.
// Using `get(activeIssueViewAtom)` (rather than `Atom.get(...)` as an Effect
// service) registers the dependency via AtomContext, so any view change —
// e.g. flipping the filter modal to "mine" — invalidates and re-fetches.
export const issuesAtom = githubRuntime
	.atom(
		Effect.fnUntraced(function* (get) {
			const github = yield* GitHubService
			const view = get(activeIssueViewAtom)
			const mode = issueViewMode(view)
			const repository = issueViewRepository(view)
			// "all" needs a repository; without one we have nothing to show until the user picks one.
			if (mode === "all" && !repository) return [] as readonly IssueItem[]
			const page = yield* github.listIssuePage(issueQueryToListInput(issueViewToQuery(view), null, pullRequestPageSize))
			return page.items
		}),
	)
	.pipe(Atom.keepAlive)

export const addIssueLabelAtom = githubRuntime.fn<{ readonly repository: string; readonly number: number; readonly label: string }>()((input) =>
	GitHubService.use((github) => github.addIssueLabel(input.repository, input.number, input.label)),
)

export const removeIssueLabelAtom = githubRuntime.fn<{ readonly repository: string; readonly number: number; readonly label: string }>()((input) =>
	GitHubService.use((github) => github.removeIssueLabel(input.repository, input.number, input.label)),
)
