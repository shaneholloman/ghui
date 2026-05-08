import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

const repository = process.env.GHUI_MOCK_REPOSITORY?.trim() || "anomalyco/opencode"
const limit = Number.parseInt(process.env.GHUI_MOCK_FIXTURE_LIMIT ?? "50", 10)
const outputPath = resolve(process.cwd(), process.env.GHUI_MOCK_FIXTURE_PATH ?? ".ghui/opencode-fixtures.json")

const gh = (args: readonly string[]) => {
	const result = Bun.spawnSync(["gh", ...args], { stdout: "pipe", stderr: "pipe" })
	if (!result.success) {
		throw new Error(result.stderr.toString().trim() || `gh ${args.join(" ")} failed`)
	}
	return result.stdout.toString()
}

const apiJson = <A>(path: string): A => JSON.parse(gh(["api", path])) as A
const apiText = (path: string, accept: string) => gh(["api", "-H", `Accept: ${accept}`, path])

type RawUser = { readonly login?: string | null }
type RawLabel = { readonly name?: string | null; readonly color?: string | null }

type RawPull = {
	readonly number: number
	readonly title?: string | null
	readonly body?: string | null
	readonly user?: RawUser | null
	readonly head?: { readonly ref?: string | null; readonly sha?: string | null } | null
	readonly base?: { readonly ref?: string | null; readonly repo?: { readonly default_branch?: string | null } | null } | null
	readonly html_url?: string | null
	readonly created_at?: string | null
	readonly closed_at?: string | null
	readonly draft?: boolean | null
	readonly additions?: number | null
	readonly deletions?: number | null
	readonly changed_files?: number | null
	readonly labels?: readonly RawLabel[]
}

type RawIssue = {
	readonly number: number
	readonly title?: string | null
	readonly body?: string | null
	readonly user?: RawUser | null
	readonly html_url?: string | null
	readonly created_at?: string | null
	readonly updated_at?: string | null
	readonly comments?: number | null
	readonly labels?: readonly RawLabel[]
	readonly pull_request?: unknown
}

type RawComment = {
	readonly id: number
	readonly body?: string | null
	readonly user?: RawUser | null
	readonly created_at?: string | null
	readonly html_url?: string | null
}

type RawCheckRun = {
	readonly name?: string | null
	readonly status?: string | null
	readonly conclusion?: string | null
}

type RawCheckRunsResponse = {
	readonly check_runs?: readonly RawCheckRun[]
}

type RawStatus = {
	readonly context?: string | null
	readonly state?: string | null
}

type RawStatusResponse = {
	readonly statuses?: readonly RawStatus[]
}

type RawReviewComment = RawComment & {
	readonly path?: string | null
	readonly line?: number | null
	readonly original_line?: number | null
	readonly side?: "LEFT" | "RIGHT" | null
	readonly in_reply_to_id?: number | null
}

const labels = (source: readonly RawLabel[] | undefined) => (source ?? []).flatMap((label) => (label.name ? [{ name: label.name, color: label.color ?? null }] : []))

const CHECK_STATUS_BY_RAW = {
	COMPLETED: "completed",
	IN_PROGRESS: "in_progress",
	QUEUED: "queued",
} as const

const CHECK_CONCLUSION_BY_RAW = {
	SUCCESS: "success",
	FAILURE: "failure",
	ERROR: "failure",
	NEUTRAL: "neutral",
	SKIPPED: "skipped",
	CANCELLED: "cancelled",
	TIMED_OUT: "timed_out",
} as const

const STATUS_CONTEXT_CONCLUSION = {
	SUCCESS: "success",
	FAILURE: "failure",
	ERROR: "failure",
} as const

type CheckStatus = "completed" | "in_progress" | "queued" | "pending"
type CheckConclusion = "success" | "failure" | "neutral" | "skipped" | "cancelled" | "timed_out" | null

const normalizeCheckStatus = (raw: string | null | undefined): CheckStatus =>
	raw ? (CHECK_STATUS_BY_RAW[raw.toUpperCase() as keyof typeof CHECK_STATUS_BY_RAW] ?? "pending") : "pending"

const normalizeCheckConclusion = (raw: string | null | undefined): CheckConclusion =>
	raw ? (CHECK_CONCLUSION_BY_RAW[raw.toUpperCase() as keyof typeof CHECK_CONCLUSION_BY_RAW] ?? null) : null

const statusContextConclusion = (raw: string | null | undefined): CheckConclusion =>
	raw ? (STATUS_CONTEXT_CONCLUSION[raw.toUpperCase() as keyof typeof STATUS_CONTEXT_CONCLUSION] ?? null) : null

const checksForCommit = (sha: string) => {
	const checkRuns = apiJson<RawCheckRunsResponse>(`repos/${repository}/commits/${sha}/check-runs?per_page=100`).check_runs ?? []
	const statuses = apiJson<RawStatusResponse>(`repos/${repository}/commits/${sha}/status`).statuses ?? []
	const checks = [
		...checkRuns.map((check) => ({ name: check.name ?? "check", status: normalizeCheckStatus(check.status), conclusion: normalizeCheckConclusion(check.conclusion) })),
		...statuses.map((status) => ({
			name: status.context ?? "check",
			status: status.state?.toUpperCase() === "PENDING" ? "in_progress" : "completed",
			conclusion: statusContextConclusion(status.state),
		})),
	]

	if (checks.length === 0) return { checkStatus: "none", checkSummary: null, checks }

	let completed = 0
	let successful = 0
	let pending = false
	let failing = false
	for (const check of checks) {
		if (check.status === "completed") completed += 1
		else pending = true

		if (check.conclusion === "success" || check.conclusion === "neutral" || check.conclusion === "skipped") successful += 1
		else if (check.conclusion) failing = true
	}

	if (pending) return { checkStatus: "pending", checkSummary: `checks ${completed}/${checks.length}`, checks }
	if (failing) return { checkStatus: "failing", checkSummary: `checks ${successful}/${checks.length}`, checks }
	return { checkStatus: "passing", checkSummary: `checks ${successful}/${checks.length}`, checks }
}

const issueComments = (comments: readonly RawComment[]) =>
	comments.map((comment) => ({
		_tag: "comment" as const,
		id: String(comment.id),
		author: comment.user?.login ?? "unknown",
		body: comment.body ?? "",
		createdAt: comment.created_at ?? null,
		url: comment.html_url ?? null,
	}))

const reviewComments = (comments: readonly RawReviewComment[]) =>
	comments.flatMap((comment) => {
		const path = comment.path
		const line = comment.line ?? comment.original_line
		if (!path || !line) return []
		return [
			{
				_tag: "review-comment" as const,
				id: String(comment.id),
				path,
				line,
				side: comment.side ?? "RIGHT",
				author: comment.user?.login ?? "unknown",
				body: comment.body ?? "",
				createdAt: comment.created_at ?? null,
				url: comment.html_url ?? null,
				inReplyTo: comment.in_reply_to_id ? String(comment.in_reply_to_id) : null,
			},
		]
	})

const pullSummaries = apiJson<readonly RawPull[]>(`repos/${repository}/pulls?state=all&per_page=${limit}`)
const pullRequests = []

for (const summary of pullSummaries.slice(0, limit)) {
	const pull = apiJson<RawPull>(`repos/${repository}/pulls/${summary.number}`)
	const checkInfo = checksForCommit(pull.head?.sha ?? summary.head?.sha ?? `fixture-${summary.number}`)
	const comments = issueComments(apiJson<readonly RawComment[]>(`repos/${repository}/issues/${summary.number}/comments?per_page=100`))
	const reviews = reviewComments(apiJson<readonly RawReviewComment[]>(`repos/${repository}/pulls/${summary.number}/comments?per_page=100`))
	const diff = apiText(`repos/${repository}/pulls/${summary.number}`, "application/vnd.github.v3.diff")
	pullRequests.push({
		repository,
		author: pull.user?.login ?? "unknown",
		headRefOid: pull.head?.sha ?? `fixture-${summary.number}`,
		headRefName: pull.head?.ref ?? `fixture-${summary.number}`,
		baseRefName: pull.base?.ref ?? "main",
		defaultBranchName: pull.base?.repo?.default_branch ?? pull.base?.ref ?? "main",
		number: pull.number,
		title: pull.title ?? `Pull request #${pull.number}`,
		body: pull.body ?? "",
		labels: labels(pull.labels),
		additions: pull.additions ?? 0,
		deletions: pull.deletions ?? 0,
		changedFiles: pull.changed_files ?? 0,
		state: "open",
		reviewStatus: pull.draft ? "draft" : "none",
		checkStatus: checkInfo.checkStatus,
		checkSummary: checkInfo.checkSummary,
		checks: checkInfo.checks,
		autoMergeEnabled: false,
		detailLoaded: true,
		createdAt: pull.created_at ?? new Date().toISOString(),
		closedAt: pull.closed_at ?? null,
		url: pull.html_url ?? `https://github.com/${repository}/pull/${pull.number}`,
		diff,
		comments: [...comments, ...reviews],
		reviewComments: reviews.map(({ _tag, ...comment }) => comment),
	})
}

const rawIssues = apiJson<readonly RawIssue[]>(`repos/${repository}/issues?state=all&per_page=100`)
const issues = rawIssues
	.filter((issue) => !issue.pull_request)
	.slice(0, limit)
	.map((issue) => {
		const comments = issue.comments ? issueComments(apiJson<readonly RawComment[]>(`repos/${repository}/issues/${issue.number}/comments?per_page=100`)) : []
		return {
			repository,
			number: issue.number,
			title: issue.title ?? `Issue #${issue.number}`,
			body: issue.body ?? "",
			author: issue.user?.login ?? "unknown",
			labels: labels(issue.labels),
			commentCount: issue.comments ?? comments.length,
			createdAt: issue.created_at ?? new Date().toISOString(),
			updatedAt: issue.updated_at ?? new Date().toISOString(),
			url: issue.html_url ?? `https://github.com/${repository}/issues/${issue.number}`,
			comments,
		}
	})

mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify({ repository, generatedAt: new Date().toISOString(), pullRequests, issues }, null, 2)}\n`)
console.log(`Wrote ${pullRequests.length} pull requests and ${issues.length} issues to ${outputPath}`)
