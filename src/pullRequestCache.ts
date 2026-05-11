import type { PullRequestItem } from "./domain.js"

// When a fresh summary page arrives, fold in fields that only the detail
// query carries (body, labels, line counts, status checks) from a cached
// detail-loaded copy at the *same* SHA. Otherwise the row would lose its
// detail every refresh: the summary fragment omits `statusCheckRollup`, so
// without this merge the cached `✓`/`✗` icons would revert to blank on every
// page fetch, and hydration would refuse to rerun because `detailLoaded` is
// still true.
export const mergeCachedDetails = (fresh: readonly PullRequestItem[], cached: readonly PullRequestItem[] | undefined) => {
	if (!cached) return fresh
	const cachedByUrl = new Map(cached.map((pullRequest) => [pullRequest.url, pullRequest]))
	return fresh.map((pullRequest) => {
		const cachedPullRequest = cachedByUrl.get(pullRequest.url)
		if (!cachedPullRequest?.detailLoaded || cachedPullRequest.headRefOid !== pullRequest.headRefOid) return pullRequest
		return {
			...pullRequest,
			body: cachedPullRequest.body,
			labels: cachedPullRequest.labels,
			additions: cachedPullRequest.additions,
			deletions: cachedPullRequest.deletions,
			changedFiles: cachedPullRequest.changedFiles,
			checkStatus: cachedPullRequest.checkStatus,
			checkSummary: cachedPullRequest.checkSummary,
			checks: cachedPullRequest.checks,
			detailLoaded: true,
		} satisfies PullRequestItem
	})
}
