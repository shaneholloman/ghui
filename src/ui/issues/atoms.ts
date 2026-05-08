import { Effect } from "effect"
import * as Atom from "effect/unstable/reactivity/Atom"
import type { IssueItem } from "../../domain.js"
import { viewRepository } from "../../pullRequestViews.js"
import { GitHubService } from "../../services/GitHubService.js"
import { githubRuntime } from "../../services/runtime.js"
import { activeViewAtom } from "../pullRequests/atoms.js"

export const issuesAtom = githubRuntime
	.atom(
		GitHubService.use((github) =>
			Effect.gen(function* () {
				const view = yield* Atom.get(activeViewAtom)
				const repository = viewRepository(view)
				if (!repository) return [] as readonly IssueItem[]
				return yield* github.listOpenIssues(repository)
			}),
		),
	)
	.pipe(Atom.keepAlive)

export const addIssueLabelAtom = githubRuntime.fn<{ readonly repository: string; readonly number: number; readonly label: string }>()((input) =>
	GitHubService.use((github) => github.addIssueLabel(input.repository, input.number, input.label)),
)

export const removeIssueLabelAtom = githubRuntime.fn<{ readonly repository: string; readonly number: number; readonly label: string }>()((input) =>
	GitHubService.use((github) => github.removeIssueLabel(input.repository, input.number, input.label)),
)
