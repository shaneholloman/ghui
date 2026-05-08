import { Effect, Schedule } from "effect"
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult"
import * as Atom from "effect/unstable/reactivity/Atom"
import { config } from "../../config.js"
import type {
	IssueItem,
	ListPullRequestPageInput,
	LoadStatus,
	PullRequestItem,
	PullRequestLabel,
	PullRequestMergeAction,
	PullRequestMergeMethod,
	RepositoryMergeMethods,
} from "../../domain.js"
import { mergeCachedDetails } from "../../pullRequestCache.js"
import type { PullRequestLoad } from "../../pullRequestLoad.js"
import { initialPullRequestView, type PullRequestView, viewCacheKey, viewMode, viewRepository } from "../../pullRequestViews.js"
import { CacheService, type PullRequestCacheKey } from "../../services/CacheService.js"
import { GitHubService } from "../../services/GitHubService.js"
import { detectedRepository, githubRuntime, pullRequestPageSize } from "../../services/runtime.js"
import { effectiveFilterQueryAtom } from "../filter/atoms.js"
import { initialRetryProgress, RetryProgress } from "../FooterHints.js"
import { selectedIndexAtom } from "../listSelection/atoms.js"
import { groupBy } from "../pullRequests.js"

export const PR_FETCH_RETRIES = 6
const MAX_REPOSITORY_CACHE_ENTRIES = 8

// === UI cache atoms ===
export const labelCacheAtom = Atom.make<Record<string, readonly PullRequestLabel[]>>({}).pipe(Atom.keepAlive)
export const repoMergeMethodsCacheAtom = Atom.make<Record<string, RepositoryMergeMethods>>({}).pipe(Atom.keepAlive)
export const lastUsedMergeMethodAtom = Atom.make<Record<string, PullRequestMergeMethod>>({}).pipe(Atom.keepAlive)
export const pullRequestOverridesAtom = Atom.make<Record<string, PullRequestItem>>({}).pipe(Atom.keepAlive)
export const issueOverridesAtom = Atom.make<Record<string, IssueItem>>({}).pipe(Atom.keepAlive)
export const recentlyCompletedPullRequestsAtom = Atom.make<Record<string, PullRequestItem>>({}).pipe(Atom.keepAlive)

// === Atom-key helpers (shared with diff atoms) ===
export const pullRequestRevisionAtomKey = (pullRequest: PullRequestItem) => `${pullRequest.repository}\u0000${pullRequest.number}\u0000${pullRequest.headRefOid}`
export const parsePullRequestRevisionAtomKey = (key: string, label: string): { repository: string; number: number } => {
	const [repository, number] = key.split("\u0000")
	if (!repository || !number) throw new Error(`Invalid pull request ${label} key: ${key}`)
	return { repository, number: Number.parseInt(number, 10) }
}
export const pullRequestDetailKey = (pullRequest: PullRequestItem) => `${pullRequest.url}:${pullRequest.headRefOid}`

// === Helpers used by atom bodies and by load-more handlers ===
export const appendPullRequestPage = (existing: readonly PullRequestItem[], incoming: readonly PullRequestItem[]): readonly PullRequestItem[] => {
	const seen = new Set(existing.map((pullRequest) => pullRequest.url))
	const mergedIncoming = mergeCachedDetails(incoming, existing)
	return [...existing, ...mergedIncoming.filter((pullRequest) => !seen.has(pullRequest.url))]
}

export const cacheViewerFor = (view: PullRequestView, username: string | null): string | null => (view._tag === "Repository" ? "anonymous" : username)

const trimQueueLoadCache = (cache: Partial<Record<string, PullRequestLoad>>) => {
	const repositoryKeys = Object.keys(cache).filter((key) => key.startsWith("repository:"))
	if (repositoryKeys.length <= MAX_REPOSITORY_CACHE_ENTRIES) return cache
	const remove = new Set(repositoryKeys.slice(0, repositoryKeys.length - MAX_REPOSITORY_CACHE_ENTRIES))
	return Object.fromEntries(Object.entries(cache).filter(([key]) => !remove.has(key))) as Partial<Record<string, PullRequestLoad>>
}

// === View / queue state atoms ===
export const retryProgressAtom = Atom.make<RetryProgress>(initialRetryProgress).pipe(Atom.keepAlive)
export const activeViewAtom = Atom.make<PullRequestView>(initialPullRequestView(detectedRepository)).pipe(Atom.keepAlive)
export const queueLoadCacheAtom = Atom.make<Partial<Record<string, PullRequestLoad>>>({}).pipe(Atom.keepAlive)
export const queueSelectionAtom = Atom.make<Partial<Record<string, number>>>({}).pipe(Atom.keepAlive)

// === Data-fetching atoms ===
export const pullRequestsAtom = githubRuntime
	.atom(
		GitHubService.use((github) =>
			Effect.gen(function* () {
				const cacheService = yield* CacheService
				const view = yield* Atom.get(activeViewAtom)
				const queueMode = viewMode(view)
				const repository = viewRepository(view)
				const cacheKey = viewCacheKey(view)
				const cacheUsername = view._tag === "Repository" ? null : yield* github.getAuthenticatedUser().pipe(Effect.catch(() => Effect.succeed(null)))
				const cacheViewer = cacheViewerFor(view, cacheUsername)
				if (cacheViewer) {
					const cachedLoad = yield* cacheService.readQueue(cacheViewer, view).pipe(Effect.catch(() => Effect.succeed(null)))
					if (cachedLoad) {
						const cache = yield* Atom.get(queueLoadCacheAtom)
						yield* Atom.set(queueLoadCacheAtom, trimQueueLoadCache({ ...cache, [cacheKey]: cachedLoad }))
					}
				}
				yield* Atom.set(retryProgressAtom, initialRetryProgress)
				const page = yield* github
					.listOpenPullRequestPage({
						mode: queueMode,
						repository,
						cursor: null,
						pageSize: Math.min(pullRequestPageSize, config.prFetchLimit),
					})
					.pipe(
						Effect.tapError(() =>
							Atom.update(retryProgressAtom, (current) =>
								RetryProgress.Retrying({
									attempt: Math.min(RetryProgress.$match(current, { Idle: () => 0, Retrying: ({ attempt }) => attempt }) + 1, PR_FETCH_RETRIES),
									max: PR_FETCH_RETRIES,
								}),
							),
						),
						Effect.retry({ times: PR_FETCH_RETRIES, schedule: Schedule.exponential("300 millis", 2) }),
						Effect.tapError(() => Atom.set(retryProgressAtom, initialRetryProgress)),
					)

				yield* Atom.set(retryProgressAtom, initialRetryProgress)
				const cache = yield* Atom.get(queueLoadCacheAtom)
				const existingLoad = cache[cacheKey]
				const data = mergeCachedDetails(page.items, existingLoad?.data)
				const load = {
					view,
					data,
					fetchedAt: new Date(),
					endCursor: page.endCursor,
					hasNextPage: page.hasNextPage && data.length < config.prFetchLimit,
				} satisfies PullRequestLoad
				const nextCache = { ...cache }
				delete nextCache[cacheKey]
				nextCache[cacheKey] = load
				yield* Atom.set(queueLoadCacheAtom, trimQueueLoadCache(nextCache))
				if (cacheViewer) yield* cacheService.writeQueue(cacheViewer, load)
				return load
			}),
		),
	)
	.pipe(Atom.keepAlive)

export const usernameAtom = githubRuntime.atom(GitHubService.use((github) => github.getAuthenticatedUser())).pipe(Atom.keepAlive)

export const listRepoLabelsAtom = githubRuntime.fn<string>()((repository) => GitHubService.use((github) => github.listRepoLabels(repository)))

export const listOpenPullRequestPageAtom = githubRuntime.fn<ListPullRequestPageInput>()((input) => GitHubService.use((github) => github.listOpenPullRequestPage(input)))

export const pullRequestDetailsAtom = Atom.family((key: string) => {
	const { repository, number } = parsePullRequestRevisionAtomKey(key, "detail")
	return githubRuntime.atom(GitHubService.use((github) => github.getPullRequestDetails(repository, number)))
})

export const readCachedPullRequestAtom = githubRuntime.fn<PullRequestCacheKey>()((key) => CacheService.use((cache) => cache.readPullRequest(key)))
export const writeCachedPullRequestAtom = githubRuntime.fn<PullRequestItem>()((pullRequest) => CacheService.use((cache) => cache.upsertPullRequest(pullRequest)))
export const writeQueueCacheAtom = githubRuntime.fn<{ readonly viewer: string; readonly load: PullRequestLoad }>()(({ viewer, load }) =>
	CacheService.use((cache) => cache.writeQueue(viewer, load)),
)
export const pruneCacheAtom = githubRuntime.fn<void>()(() => CacheService.use((cache) => cache.prune()))

export const addPullRequestLabelAtom = githubRuntime.fn<{ readonly repository: string; readonly number: number; readonly label: string }>()((input) =>
	GitHubService.use((github) => github.addPullRequestLabel(input.repository, input.number, input.label)),
)
export const removePullRequestLabelAtom = githubRuntime.fn<{ readonly repository: string; readonly number: number; readonly label: string }>()((input) =>
	GitHubService.use((github) => github.removePullRequestLabel(input.repository, input.number, input.label)),
)
export const toggleDraftAtom = githubRuntime.fn<{ readonly repository: string; readonly number: number; readonly isDraft: boolean }>()((input) =>
	GitHubService.use((github) => github.toggleDraftStatus(input.repository, input.number, input.isDraft)),
)

export const getPullRequestMergeInfoAtom = githubRuntime.fn<{ readonly repository: string; readonly number: number }>()((input) =>
	GitHubService.use((github) => github.getPullRequestMergeInfo(input.repository, input.number)),
)
export const getRepositoryMergeMethodsAtom = githubRuntime.fn<string>()((repository) => GitHubService.use((github) => github.getRepositoryMergeMethods(repository)))
export const mergePullRequestAtom = githubRuntime.fn<{ readonly repository: string; readonly number: number; readonly action: PullRequestMergeAction }>()((input) =>
	GitHubService.use((github) => github.mergePullRequest(input.repository, input.number, input.action)),
)
export const closePullRequestAtom = githubRuntime.fn<{ readonly repository: string; readonly number: number }>()((input) =>
	GitHubService.use((github) => github.closePullRequest(input.repository, input.number)),
)

// === Derived atoms (PR list pipeline) ===
const pullRequestFilterScore = (pullRequest: PullRequestItem, query: string) => {
	const normalized = query.trim().toLowerCase()
	if (normalized.length === 0) return 0
	const fields = [pullRequest.title.toLowerCase(), pullRequest.repository.toLowerCase(), pullRequest.headRefName.toLowerCase(), String(pullRequest.number)]
	const scores = fields.flatMap((field, index) => {
		const matchIndex = field.indexOf(normalized)
		return matchIndex >= 0 ? [index * 1000 + matchIndex] : []
	})
	return scores.length > 0 ? Math.min(...scores) : null
}

export const pullRequestLoadAtom = Atom.make((get) => {
	const view = get(activeViewAtom)
	const cacheKey = viewCacheKey(view)
	const cache = get(queueLoadCacheAtom)
	const result = get(pullRequestsAtom)
	const resolved = AsyncResult.getOrElse(result, () => null)
	return cache[cacheKey] ?? (resolved && viewCacheKey(resolved.view) === cacheKey ? resolved : null)
})

export const isLoadingQueueModeAtom = Atom.make((get) => {
	const cacheKey = viewCacheKey(get(activeViewAtom))
	const resolved = AsyncResult.getOrElse(get(pullRequestsAtom), () => null)
	return resolved !== null && viewCacheKey(resolved.view) !== cacheKey
})

export const pullRequestStatusAtom = Atom.make((get): LoadStatus => {
	const result = get(pullRequestsAtom)
	const load = get(pullRequestLoadAtom)
	const isLoadingQueue = get(isLoadingQueueModeAtom)
	if ((result.waiting || isLoadingQueue) && load === null) return "loading"
	if (AsyncResult.isFailure(result) && load === null) return "error"
	return "ready"
})

export const displayedPullRequestsAtom = Atom.make((get) => {
	const load = get(pullRequestLoadAtom)
	const overrides = get(pullRequestOverridesAtom)
	const recentlyCompleted = get(recentlyCompletedPullRequestsAtom)
	const source = load?.data ?? []
	const seenUrls = new Set<string>()
	const open = source.map((pullRequest) => {
		seenUrls.add(pullRequest.url)
		return recentlyCompleted[pullRequest.url] ?? overrides[pullRequest.url] ?? pullRequest
	})
	return [...open, ...Object.values(recentlyCompleted).filter((pullRequest) => !seenUrls.has(pullRequest.url))]
})

export const filteredPullRequestsAtom = Atom.make((get) => {
	const pullRequests = get(displayedPullRequestsAtom)
	const query = get(effectiveFilterQueryAtom)
	if (query.length === 0) return pullRequests
	return pullRequests
		.flatMap((pullRequest) => {
			const score = pullRequestFilterScore(pullRequest, query)
			return score === null ? [] : [{ pullRequest, score }]
		})
		.sort((left, right) => left.score - right.score || right.pullRequest.createdAt.getTime() - left.pullRequest.createdAt.getTime())
		.map(({ pullRequest }) => pullRequest)
})

export const visibleRepoOrderAtom = Atom.make((get) => {
	const query = get(effectiveFilterQueryAtom)
	if (query.length === 0) return [] as readonly string[]
	return [...new Set(get(filteredPullRequestsAtom).map((pullRequest) => pullRequest.repository))]
})

export const visibleGroupsAtom = Atom.make((get) => groupBy(get(filteredPullRequestsAtom), (pullRequest) => pullRequest.repository, get(visibleRepoOrderAtom)))

export const visiblePullRequestsAtom = Atom.make((get) => get(visibleGroupsAtom).flatMap(([, pullRequests]) => pullRequests))

export const groupStartsAtom = Atom.make((get) => {
	const groups = get(visibleGroupsAtom)
	const starts: number[] = []
	for (let index = 0; index < groups.length; index++) {
		if (index === 0) starts.push(0)
		else starts.push(starts[index - 1]! + groups[index - 1]![1].length)
	}
	return starts
})

export const selectedPullRequestAtom = Atom.make((get) => {
	const pullRequests = get(visiblePullRequestsAtom)
	const index = get(selectedIndexAtom)
	return pullRequests[index] ?? null
})
