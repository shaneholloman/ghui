import type { PullRequestLabel } from "../domain.js"

const pick = <A>(items: readonly A[], index: number): A => items[((index % items.length) + items.length) % items.length]!

const people = ["mira", "devon", "nina", "oscar", "mina", "buster", "jules", "tess", "rowan", "kai"] as const

const labels: readonly PullRequestLabel[][] = [
	[],
	[{ name: "bug", color: "#d73a4a" }],
	[{ name: "enhancement", color: "#a2eeef" }],
	[{ name: "ui", color: "#c5def5" }],
	[{ name: "performance", color: "#fbca04" }],
	[
		{ name: "tests", color: "#0e8a16" },
		{ name: "refactor", color: "#d4c5f9" },
	],
]

const prVerbs = ["Stabilize", "Teach", "Tighten", "Unify", "Polish", "Cache", "Thread", "Shrink", "Restore", "Explain"] as const
const prObjects = [
	"diff selection",
	"repository switching",
	"theme fallback",
	"review comments",
	"release packaging",
	"keyboard hints",
	"modal dividers",
	"status checks",
	"cache hydration",
	"wrapped lines",
] as const
const prContexts = [
	"when the terminal resizes",
	"for repo workspaces",
	"without waking the API dragon",
	"after background refresh",
	"in narrow panes",
	"while the duck watches",
	"across split and unified views",
	"before the release train leaves",
] as const

const issueOpeners = [
	"Diff view",
	"Repository home",
	"Issue sidebar",
	"Command palette",
	"Mock data",
	"Theme picker",
	"Release flow",
	"Cache layer",
	"Actions tab",
	"Keyboard map",
] as const
const issueProblems = [
	"needs a calmer empty state",
	"forgets the selected row after refresh",
	"should make repo context obvious",
	"uses copy that sounds like a robot wrote it",
	"needs better loading feedback",
	"should remember the last filter",
	"clips long labels in tiny terminals",
	"needs a second pass on mouse hover",
] as const

const bodyIntros = [
	"This started as a small papercut, but it keeps showing up during review.",
	"The workflow is technically possible today, but it asks the user to remember too much.",
	"The current behavior works in the happy path and gets weird around the edges.",
	"This is mostly a UX cleanup, with one tiny gremlin hiding in the state model.",
] as const

const bodyDetails = [
	"Expected: the selected project stays legible, keyboard hints stay local, and the list does not jump around.",
	"Observed: the screen gives the right data but the hierarchy is harder to read than it needs to be.",
	"A good fix probably keeps the existing service boundary and only changes the presentation layer.",
	"Worth checking both narrow and wide layouts; the bug likes to wear different hats.",
] as const

export const mockAuthor = (index: number) => pick(people, index)

export const mockLabels = (index: number): readonly PullRequestLabel[] => pick(labels, index)

export const mockPullRequestTitle = (index: number) => `${pick(prVerbs, index)} ${pick(prObjects, index * 3)} ${pick(prContexts, index * 5)}`

export const mockPullRequestBranch = (index: number) =>
	`${pick(["fix", "feat", "chore", "perf", "ui"], index)}/${pick(prObjects, index).replaceAll(" ", "-").replaceAll("/", "-")}-${1000 + index}`

export const mockIssueTitle = (index: number) => `${pick(issueOpeners, index)} ${pick(issueProblems, index * 2)}`

export const mockBody = (kind: "issue" | "pull-request", index: number) => {
	const intro = pick(bodyIntros, index)
	const detail = pick(bodyDetails, index * 3)
	const closer = kind === "pull-request" ? "This should be safe to review commit-by-commit." : "A small fix here would make the workspace feel more intentional."
	return `${intro}\n\n${detail}\n\n${closer}`
}
