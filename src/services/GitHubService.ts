import { config } from "../config.js"
import type { PullRequestItem } from "../domain.js"
import { run, runJson } from "./CommandRunner.js"

interface GitHubListPullRequest {
	readonly number: number
	readonly title: string
	readonly body: string
	readonly labels: readonly {
		readonly name: string
		readonly color?: string | null
	}[]
	readonly isDraft: boolean
	readonly reviewDecision: string
	readonly statusCheckRollup: readonly {
		readonly status?: string | null
		readonly conclusion?: string | null
	}[]
	readonly state: string
	readonly createdAt: string
	readonly closedAt?: string | null
	readonly url: string
}

const jsonFields = "number,title,body,labels,isDraft,reviewDecision,statusCheckRollup,state,createdAt,closedAt,url"

const normalizeDate = (value: string | null | undefined) => {
	if (!value || value.startsWith("0001-01-01")) return null
	return new Date(value)
}

const getReviewStatus = (item: GitHubListPullRequest): PullRequestItem["reviewStatus"] => {
	if (item.isDraft) return "draft"
	if (item.reviewDecision === "APPROVED") return "approved"
	if (item.reviewDecision === "CHANGES_REQUESTED") return "changes"
	if (item.reviewDecision === "REVIEW_REQUIRED") return "review"
	return "none"
}

const getCheckInfo = (item: GitHubListPullRequest): Pick<PullRequestItem, "checkStatus" | "checkSummary"> => {
	if (item.statusCheckRollup.length === 0) {
		return { checkStatus: "none", checkSummary: null }
	}

	let completed = 0
	let successful = 0
	let pending = false
	let failing = false

	for (const check of item.statusCheckRollup) {
		if (check.status === "COMPLETED") {
			completed += 1
		} else {
			pending = true
		}

		if (check.conclusion === "SUCCESS" || check.conclusion === "NEUTRAL" || check.conclusion === "SKIPPED") {
			successful += 1
		} else if (check.conclusion && check.conclusion !== "SUCCESS") {
			failing = true
		}
	}

	if (pending) {
		return { checkStatus: "pending", checkSummary: `checks ${completed}/${item.statusCheckRollup.length}` }
	}

	if (failing) {
		return { checkStatus: "failing", checkSummary: `checks ${successful}/${item.statusCheckRollup.length}` }
	}

	return { checkStatus: "passing", checkSummary: `checks ${successful}/${item.statusCheckRollup.length}` }
}

const parsePullRequest = (repository: string, item: GitHubListPullRequest): PullRequestItem => {
	const checkInfo = getCheckInfo(item)

	return {
		repository,
		number: item.number,
		title: item.title,
		body: item.body,
		labels: item.labels.map((label) => ({
			name: label.name,
			color: label.color ? `#${label.color}` : null,
		})),
		state: item.state.toLowerCase() === "open" ? "open" : "closed",
		reviewStatus: getReviewStatus(item),
		checkStatus: checkInfo.checkStatus,
		checkSummary: checkInfo.checkSummary,
		createdAt: new Date(item.createdAt),
		closedAt: normalizeDate(item.closedAt),
		url: item.url,
	}
}

const listOpenArgs = (repository: string, author: string) => [
	"pr",
	"list",
	"--repo",
	repository,
	"--author",
	author,
	"--state",
	"open",
	"--limit",
	String(config.prFetchLimit),
	"--json",
	jsonFields,
] as const

export const listOpenPullRequests = async (): Promise<readonly PullRequestItem[]> => {
	const groups = await Promise.all(
		config.repos.map(async (repository) => {
			const pullRequests = await runJson<readonly GitHubListPullRequest[]>("gh", [...listOpenArgs(repository, config.author)])
			return pullRequests.map((pullRequest) => parsePullRequest(repository, pullRequest))
		}),
	)

	return groups.flat().sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
}

export const toggleDraftStatus = async (repository: string, number: number, isDraft: boolean) => {
	await run("gh", ["pr", "ready", String(number), "--repo", repository, ...(isDraft ? [] : ["--undo"])])
}

export const toggleBetaLabel = async (repository: string, number: number, hasBeta: boolean) => {
	await run("gh", ["pr", "edit", String(number), "--repo", repository, ...(hasBeta ? ["--remove-label", "beta"] : ["--add-label", "beta"])])
}
