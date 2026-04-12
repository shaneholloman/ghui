export type PullRequestState = "open" | "closed"

export interface PullRequestLabel {
	readonly name: string
	readonly color: string | null
}

export interface PullRequestItem {
	readonly repository: string
	readonly number: number
	readonly title: string
	readonly body: string
	readonly labels: readonly PullRequestLabel[]
	readonly state: PullRequestState
	readonly reviewStatus: "draft" | "approved" | "changes" | "review" | "none"
	readonly checkStatus: "passing" | "pending" | "failing" | "none"
	readonly checkSummary: string | null
	readonly createdAt: Date
	readonly closedAt: Date | null
	readonly url: string
}
