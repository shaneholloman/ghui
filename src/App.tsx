import type { ScrollBoxRenderable } from "@opentui/core"
import { RegistryContext, useAtom, useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react"
import { useKeymap } from "@ghui/keymap/react"
import { appKeymap, type AppCtx } from "./keymap/all.js"
import { buildAppCtx } from "./keymap/contexts/appCtx.js"
import { useOpenTuiSubscribe } from "./keyboard/opentuiAdapter.js"
import { useRenderer, useTerminalDimensions } from "@opentui/react"
import { Cause, Effect } from "effect"
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult"
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry"
import { useContext, useEffect, useMemo, useRef, useState } from "react"
import { buildAppCommands } from "./appCommands.js"
import type { AppCommand } from "./commands.js"
import { clampCommandIndex, type CommandScope, commandEnabled, defineCommand, filterCommands, sortCommandsByActiveScope } from "./commands.js"
import { config } from "./config.js"
import {
	type CreatePullRequestCommentInput,
	type DiffCommentSide,
	type IssueItem,
	type LoadStatus,
	type PullRequestComment,
	type PullRequestItem,
	type PullRequestLabel,
	type PullRequestReviewComment,
	type SubmitPullRequestReviewInput,
} from "./domain.js"
import { formatShortDate, formatTimestamp } from "./date.js"
import { errorMessage } from "./errors.js"
import type { PullRequestLoad } from "./pullRequestLoad.js"
import { activePullRequestViews, nextView, parseRepositoryInput, type PullRequestView, viewCacheKey, viewEquals, viewLabel, viewMode, viewRepository } from "./pullRequestViews.js"

import { saveStoredDiffWhitespaceMode } from "./themeStore.js"
import { colors } from "./ui/colors.js"
import {
	favoriteRepositoriesAtom,
	readWorkspacePreferencesAtom,
	recentRepositoriesAtom,
	selectedRepositoryIndexAtom,
	workspaceSurfaceAtom,
	writeWorkspacePreferencesAtom,
} from "./workspace/atoms.js"
import { useWorkspacePreferencesPersistence } from "./workspace/useWorkspacePreferencesPersistence.js"
import {
	commentsViewActiveAtom,
	commentsViewSelectionAtom,
	createPullRequestCommentAtom,
	createPullRequestIssueCommentAtom,
	deletePullRequestIssueCommentAtom,
	deleteReviewCommentAtom,
	editPullRequestIssueCommentAtom,
	editReviewCommentAtom,
	listIssueCommentsAtom,
	listPullRequestCommentsAtom,
	pullRequestCommentsAtom,
	pullRequestCommentsLoadedAtom,
	replyToReviewCommentAtom,
} from "./ui/comments/atoms.js"
import { addIssueLabelAtom, issuesAtom, removeIssueLabelAtom } from "./ui/issues/atoms.js"
import { detailFullViewAtom, detailScrollOffsetAtom } from "./ui/detail/atoms.js"
import { filterDraftAtom, filterModeAtom, filterQueryAtom } from "./ui/filter/atoms.js"
import { selectedIndexAtom, selectedIssueIndexAtom } from "./ui/listSelection/atoms.js"
import { activeModalAtom } from "./ui/modals/atoms.js"
import { noticeAtom } from "./ui/notice/atoms.js"
import { useFlashNotice } from "./ui/notice/useFlashNotice.js"
import {
	activeViewAtom,
	addPullRequestLabelAtom,
	appendPullRequestPage,
	cacheViewerFor,
	closePullRequestAtom,
	displayedPullRequestsAtom,
	groupStartsAtom,
	issueOverridesAtom,
	labelCacheAtom,
	listOpenPullRequestPageAtom,
	listRepoLabelsAtom,
	pruneCacheAtom,
	pullRequestDetailKey,
	pullRequestDetailsAtom,
	pullRequestLoadAtom,
	pullRequestOverridesAtom,
	pullRequestRevisionAtomKey,
	pullRequestsAtom,
	pullRequestStatusAtom,
	queueLoadCacheAtom,
	queueSelectionAtom,
	readCachedPullRequestAtom,
	recentlyCompletedPullRequestsAtom,
	removePullRequestLabelAtom,
	retryProgressAtom,
	selectedPullRequestAtom,
	toggleDraftAtom,
	usernameAtom,
	visibleGroupsAtom,
	visiblePullRequestsAtom,
	writeCachedPullRequestAtom,
	writeQueueCacheAtom,
} from "./ui/pullRequests/atoms.js"

import { useIdleRefresh } from "./ui/pullRequests/useIdleRefresh.js"
import { copyToClipboardAtom, openInBrowserAtom, openUrlAtom, submitPullRequestReviewAtom } from "./services/systemAtoms.js"
import {
	diffCommentAnchorIndexAtom,
	diffCommentRangeStartIndexAtom,
	diffCommentsLoadedAtom,
	diffCommentThreadsAtom,
	diffFileIndexAtom,
	diffFullViewAtom,
	diffPreferredSideAtom,
	diffRenderViewAtom,
	diffScrollTopAtom,
	diffWhitespaceModeAtom,
	diffWrapModeAtom,
	listPullRequestReviewCommentsAtom,
	pullRequestDiffAtom,
	pullRequestDiffCacheAtom,
	selectedDiffKeyAtom,
	selectedDiffStateAtom,
} from "./ui/diff/atoms.js"
import { useDiffLineColors } from "./ui/diff/useDiffLineColors.js"
import { useDiffLocationPreservation } from "./ui/diff/useDiffLocationPreservation.js"
import { useDiffPrefetch } from "./ui/diff/useDiffPrefetch.js"
import { themeIdAtom } from "./ui/theme/atoms.js"
import { useThemeModal } from "./ui/theme/useThemeModal.js"
import { useMergeFlow } from "./ui/merge/useMergeFlow.js"
import { insertText, type CommentEditorValue } from "./ui/commentEditor.js"
import {
	buildStackedDiffFiles,
	diffAnchorOnSide,
	diffCommentAnchorLabel,
	diffCommentLineLabel,
	diffCommentLocationKey,
	diffCommentSideLabel,
	getStackedDiffCommentAnchors,
	minimizeWhitespaceDiffFiles,
	PullRequestDiffState,
	pullRequestDiffKey,
	safeDiffFileIndex,
	scrollTopForVisibleLine,
	splitPatchFiles,
	stackedDiffFileIndexAtLine,
	type DiffCommentAnchor,
	type StackedDiffCommentAnchor,
	verticalDiffAnchor,
} from "./ui/diff.js"
import {
	DETAIL_BODY_SCROLL_LIMIT,
	DetailBody,
	DetailHeader,
	DetailPlaceholder,
	DetailsPane,
	getDetailsPaneHeight,
	getDetailHeaderHeight,
	getDetailJunctionRows,
	getScrollableDetailBodyHeight,
	type DetailCommentsStatus,
	type DetailPlaceholderContent,
} from "./ui/DetailsPane.js"
import { FooterHints, RetryProgress } from "./ui/FooterHints.js"
import { LoadingLogoPane } from "./ui/LoadingLogo.js"
import { SplitPane } from "./ui/paneLayout.js"
import { Divider, Filler, fitCell, PlainLine } from "./ui/primitives.js"
import {
	filterChangedFiles,
	filterLabels,
	initialChangedFilesModalState,
	initialCloseModalState,
	initialCommandPaletteState,
	initialCommentModalState,
	initialCommentThreadModalState,
	initialDeleteCommentModalState,
	initialLabelModalState,
	initialMergeModalState,
	initialModal,
	initialOpenRepositoryModalState,
	initialPullRequestStateModalState,
	initialSubmitReviewModalState,
	initialThemeModalState,
	Modal,
	submitReviewOptions,
	type ChangedFilesModalState,
	type CloseModalState,
	type CommandPaletteState,
	type CommentModalState,
	type CommentThreadModalState,
	type DeleteCommentModalState,
	type LabelModalState,
	type MergeModalState,
	type ModalState,
	type ModalTag,
	type OpenRepositoryModalState,
	type PullRequestStateModalState,
	type SubmitReviewModalState,
	type ThemeModalState,
} from "./ui/modals.js"
import { pullRequestMetadataText } from "./ui/pullRequests.js"
import { quotedReplyBody } from "./ui/comments.js"
import { CommentsPane, commentsViewRowCount, orderCommentsForDisplay } from "./ui/CommentsPane.js"
import { PullRequestDiffPane } from "./ui/PullRequestDiffPane.js"
import { buildPullRequestListRows, pullRequestListRowIndex, PullRequestList } from "./ui/PullRequestList.js"
import { type RepositoryListItem } from "./ui/RepoList.js"
import { IssuesWorkspace } from "./surfaces/IssuesWorkspace.js"
import { RepoWorkspace } from "./surfaces/RepoWorkspace.js"
import { WorkspaceModals } from "./surfaces/WorkspaceModals.js"
import { WorkspaceTabs, workspaceTabSeparatorColumns } from "./ui/WorkspaceTabs.js"
import { getIssueDetailJunctionRows, IssueDetailPane } from "./ui/IssueList.js"
import { singleLineText } from "./ui/singleLineInput.js"
import { SPINNER_FRAMES } from "./ui/spinner.js"
import { useClampedIndex } from "./ui/useClampedIndex.js"
import { usePasteHandler } from "./ui/usePasteHandler.js"
import { useScrollFollowSelected } from "./ui/useScrollFollowSelected.js"
import { useSpinnerFrame } from "./ui/useSpinnerFrame.js"
import { useTerminalFocus } from "./ui/useTerminalFocus.js"
import { useTextInputDispatcher } from "./ui/useTextInputDispatcher.js"
import { nextWorkspaceSurface, repositoryWorkspaceSurfaces, userWorkspaceSurfaces, type WorkspaceSurface } from "./workspaceSurfaces.js"
import { detectedRepository, mockPrCount, mockRepositoryCatalog, mockUserIssues, mockWorkspacePreferencesPath, pullRequestPageSize } from "./services/runtime.js"

interface DetailPlaceholderInput {
	readonly status: LoadStatus
	readonly retryProgress: RetryProgress
	readonly loadingIndicator: string
	readonly visibleCount: number
	readonly filterText: string
}

interface DiffCommentRangeSelection {
	readonly start: StackedDiffCommentAnchor
	readonly end: StackedDiffCommentAnchor
}

interface DetailHydration {
	readonly token: symbol
	notifyError: boolean
}

interface AppProps {
	readonly systemThemeGeneration?: number
}

const FOCUS_RETURN_REFRESH_MIN_MS = 60_000
const FOCUSED_IDLE_REFRESH_MS = 5 * 60_000
const AUTO_REFRESH_JITTER_MS = 10_000
const DIFF_STICKY_HEADER_LINES = 2
const LOAD_MORE_SELECTION_THRESHOLD = 8
const LOAD_MORE_SCROLL_THRESHOLD = 3
const DETAIL_PREFETCH_BEHIND = 1
const DETAIL_PREFETCH_AHEAD = 3
const DETAIL_PREFETCH_CONCURRENCY = 3
const DETAIL_PREFETCH_DELAY_MS = 120
const wrapIndex = (index: number, length: number) => (length === 0 ? 0 : ((index % length) + length) % length)

const centeredOffset = (outer: number, inner: number) => Math.floor((outer - inner) / 2)

const repositoryFilterScore = (repository: RepositoryListItem, query: string) => {
	const normalized = query.trim().toLowerCase()
	if (normalized.length === 0) return 0
	const fields = [repository.repository.toLowerCase(), repository.description?.toLowerCase() ?? "", repository.favorite ? "favorite" : "", repository.recent ? "recent" : ""]
	const scores = fields.flatMap((field, index) => {
		const matchIndex = field.indexOf(normalized)
		return matchIndex >= 0 ? [index * 1000 + matchIndex] : []
	})
	return scores.length > 0 ? Math.min(...scores) : null
}

const issueFilterScore = (issue: IssueItem, query: string) => {
	const normalized = query.trim().toLowerCase()
	if (normalized.length === 0) return 0
	const fields = [
		issue.title.toLowerCase(),
		issue.repository.toLowerCase(),
		String(issue.number),
		issue.author.toLowerCase(),
		issue.labels
			.map((label) => label.name)
			.join(" ")
			.toLowerCase(),
		issue.body.toLowerCase(),
	]
	const scores = fields.flatMap((field, index) => {
		const matchIndex = field.indexOf(normalized)
		return matchIndex >= 0 ? [index * 1000 + matchIndex] : []
	})
	return scores.length > 0 ? Math.min(...scores) : null
}

const filterByScore = <Item,>(items: readonly Item[], query: string, scoreItem: (item: Item, query: string) => number | null, getTime: (item: Item) => number) => {
	const normalized = query.trim().toLowerCase()
	if (normalized.length === 0) return items
	return items
		.flatMap((item) => {
			const score = scoreItem(item, normalized)
			return score === null ? [] : [{ item, score }]
		})
		.sort((left, right) => left.score - right.score || getTime(right.item) - getTime(left.item))
		.map(({ item }) => item)
}

const diffCommentThreadMapKey = (diffKey: string, location: Pick<PullRequestReviewComment, "path" | "side" | "line">) => `${diffKey}:${diffCommentLocationKey(location)}`

const diffCommentThreadKey = (pullRequest: PullRequestItem, comment: Pick<PullRequestReviewComment, "path" | "side" | "line">) =>
	diffCommentThreadMapKey(pullRequestDiffKey(pullRequest), comment)

const groupDiffCommentThreads = (pullRequest: PullRequestItem, comments: readonly PullRequestReviewComment[]) => {
	const threads: Record<string, PullRequestReviewComment[]> = {}
	for (const comment of comments) {
		const key = diffCommentThreadKey(pullRequest, comment)
		const thread = threads[key]
		if (thread) thread.push(comment)
		else threads[key] = [comment]
	}
	return threads
}

const isLocalDiffComment = (comment: PullRequestReviewComment) => comment.id.startsWith("local:")

const reviewCommentAsPullRequestComment = (comment: PullRequestReviewComment): PullRequestComment => ({ _tag: "review-comment", ...comment })

// Walk the inReplyTo chain to find the thread root id. The /replies endpoint
// rejects ids that aren't roots with "parent comment not found".
const findReviewThreadRootId = (comments: readonly PullRequestComment[], commentId: string): string => {
	const reviewById = new Map<string, PullRequestComment & { readonly _tag: "review-comment" }>()
	for (const entry of comments) if (entry._tag === "review-comment") reviewById.set(entry.id, entry)
	let cursor = reviewById.get(commentId)
	const seen = new Set<string>()
	while (cursor && cursor.inReplyTo && !seen.has(cursor.id)) {
		seen.add(cursor.id)
		const parent = reviewById.get(cursor.inReplyTo)
		if (!parent) break
		cursor = parent
	}
	return cursor?.id ?? commentId
}

const reviewStatusAfterSubmit = {
	COMMENT: null,
	APPROVE: "approved",
	REQUEST_CHANGES: "changes",
} satisfies Record<SubmitPullRequestReviewInput["event"], PullRequestItem["reviewStatus"] | null>

const sameDiffCommentTarget = (left: DiffCommentAnchor, right: DiffCommentAnchor) => left.path === right.path && left.side === right.side

const diffCommentRangeSelection = (start: StackedDiffCommentAnchor | null, end: StackedDiffCommentAnchor | null): DiffCommentRangeSelection | null => {
	if (!start || !end || !sameDiffCommentTarget(start, end)) return null
	return start.line <= end.line ? { start, end } : { start: end, end: start }
}

const diffCommentRangeContains = (range: DiffCommentRangeSelection, anchor: StackedDiffCommentAnchor) =>
	sameDiffCommentTarget(range.start, anchor) && anchor.line >= range.start.line && anchor.line <= range.end.line

const diffCommentRangeLabel = (range: DiffCommentRangeSelection) =>
	range.start.line === range.end.line
		? diffCommentAnchorLabel(range.end)
		: `${diffCommentSideLabel(range.end)} ${diffCommentLineLabel(range.start)}-${diffCommentLineLabel(range.end)}`

const getDetailPlaceholderContent = ({ status, retryProgress, loadingIndicator, visibleCount, filterText }: DetailPlaceholderInput): DetailPlaceholderContent => {
	if (status === "loading") {
		return {
			title: `${loadingIndicator} Loading pull requests`,
			hint: retryProgress._tag === "Retrying" ? `Retry ${retryProgress.attempt}/${retryProgress.max}` : "Fetching latest open PRs",
		}
	}

	if (status === "error") {
		return {
			title: "Could not load pull requests",
			hint: "Press r to retry",
		}
	}

	if (visibleCount === 0 && filterText.length > 0) {
		return {
			title: "No matching pull requests",
			hint: "Press esc to clear the filter",
		}
	}

	if (visibleCount === 0) {
		return {
			title: "No open pull requests",
			hint: "Press r to refresh",
		}
	}

	return {
		title: "Select a pull request",
		hint: "Use up/down to move",
	}
}

export const App = ({ systemThemeGeneration = 0 }: AppProps) => {
	const renderer = useRenderer()
	const { width, height } = useTerminalDimensions()
	const registry = useContext(RegistryContext)
	const pullRequestResult = useAtomValue(pullRequestsAtom)
	const refreshPullRequestsAtom = useAtomRefresh(pullRequestsAtom)
	const [activeView, setActiveView] = useAtom(activeViewAtom)
	const setQueueLoadCache = useAtomSet(queueLoadCacheAtom)
	const setQueueSelection = useAtomSet(queueSelectionAtom)
	const [selectedIndex, setSelectedIndex] = useAtom(selectedIndexAtom)
	const [notice, setNotice] = useAtom(noticeAtom)
	const [filterQuery, setFilterQuery] = useAtom(filterQueryAtom)
	const [filterDraft, setFilterDraft] = useAtom(filterDraftAtom)
	const [filterMode, setFilterMode] = useAtom(filterModeAtom)
	const [detailFullView, setDetailFullView] = useAtom(detailFullViewAtom)
	const setDetailScrollOffset = useAtomSet(detailScrollOffsetAtom)
	const [diffFullView, setDiffFullView] = useAtom(diffFullViewAtom)
	const [commentsViewActive, setCommentsViewActive] = useAtom(commentsViewActiveAtom)
	const [commentsViewSelection, setCommentsViewSelection] = useAtom(commentsViewSelectionAtom)
	const [diffFileIndex, setDiffFileIndex] = useAtom(diffFileIndexAtom)
	const [diffScrollTop, setDiffScrollTop] = useAtom(diffScrollTopAtom)
	const [diffRenderView, setDiffRenderView] = useAtom(diffRenderViewAtom)
	const [diffWrapMode, setDiffWrapMode] = useAtom(diffWrapModeAtom)
	const [diffWhitespaceMode, setDiffWhitespaceMode] = useAtom(diffWhitespaceModeAtom)
	const [diffCommentAnchorIndex, setDiffCommentAnchorIndex] = useAtom(diffCommentAnchorIndexAtom)
	const [diffPreferredSide, setDiffPreferredSide] = useAtom(diffPreferredSideAtom)
	const [diffCommentRangeStartIndex, setDiffCommentRangeStartIndex] = useAtom(diffCommentRangeStartIndexAtom)
	const [diffCommentThreads, setDiffCommentThreads] = useAtom(diffCommentThreadsAtom)
	const setDiffCommentsLoaded = useAtomSet(diffCommentsLoadedAtom)
	const setPullRequestComments = useAtomSet(pullRequestCommentsAtom)
	const setPullRequestCommentsLoaded = useAtomSet(pullRequestCommentsLoadedAtom)
	const setPullRequestDiffCache = useAtomSet(pullRequestDiffCacheAtom)
	const [activeModal, setActiveModal] = useAtom(activeModalAtom)
	const themeId = useAtomValue(themeIdAtom)
	const closeActiveModal = () => setActiveModal(initialModal)
	const labelModalActive = Modal.$is("Label")(activeModal)
	const closeModalActive = Modal.$is("Close")(activeModal)
	const pullRequestStateModalActive = Modal.$is("PullRequestState")(activeModal)
	const mergeModalActive = Modal.$is("Merge")(activeModal)
	const commentModalActive = Modal.$is("Comment")(activeModal)
	const deleteCommentModalActive = Modal.$is("DeleteComment")(activeModal)
	const commentThreadModalActive = Modal.$is("CommentThread")(activeModal)
	const changedFilesModalActive = Modal.$is("ChangedFiles")(activeModal)
	const submitReviewModalActive = Modal.$is("SubmitReview")(activeModal)
	const themeModalActive = Modal.$is("Theme")(activeModal)
	const commandPaletteActive = Modal.$is("CommandPalette")(activeModal)
	const openRepositoryModalActive = Modal.$is("OpenRepository")(activeModal)
	const labelModal: LabelModalState = labelModalActive ? activeModal : initialLabelModalState
	const closeModal: CloseModalState = closeModalActive ? activeModal : initialCloseModalState
	const pullRequestStateModal: PullRequestStateModalState = pullRequestStateModalActive ? activeModal : initialPullRequestStateModalState
	const mergeModal: MergeModalState = mergeModalActive ? activeModal : initialMergeModalState
	const commentModal: CommentModalState = commentModalActive ? activeModal : initialCommentModalState
	const deleteCommentModal: DeleteCommentModalState = deleteCommentModalActive ? activeModal : initialDeleteCommentModalState
	const commentThreadModal: CommentThreadModalState = commentThreadModalActive ? activeModal : initialCommentThreadModalState
	const changedFilesModal: ChangedFilesModalState = changedFilesModalActive ? activeModal : initialChangedFilesModalState
	const submitReviewModal: SubmitReviewModalState = submitReviewModalActive ? activeModal : initialSubmitReviewModalState
	const themeModal: ThemeModalState = themeModalActive ? activeModal : initialThemeModalState
	const commandPalette: CommandPaletteState = commandPaletteActive ? activeModal : initialCommandPaletteState
	const openRepositoryModal: OpenRepositoryModalState = openRepositoryModalActive ? activeModal : initialOpenRepositoryModalState
	const makeModalSetter =
		<Tag extends Exclude<ModalTag, "None">>(tag: Tag) =>
		(next: ModalState<Tag> | ((prev: ModalState<Tag>) => ModalState<Tag>)) =>
			setActiveModal((current) => {
				const ctor = Modal[tag] as unknown as (args: ModalState<Tag>) => Modal
				if (typeof next === "function") {
					const updater = next as (prev: ModalState<Tag>) => ModalState<Tag>
					if (current._tag !== tag) return current
					return ctor(updater(current as unknown as ModalState<Tag>))
				}
				return ctor(next)
			})
	const setLabelModal = makeModalSetter("Label")
	const setCloseModal = makeModalSetter("Close")
	const setPullRequestStateModal = makeModalSetter("PullRequestState")
	const setMergeModal = makeModalSetter("Merge")
	const setCommentModal = makeModalSetter("Comment")
	const setDeleteCommentModal = makeModalSetter("DeleteComment")
	const setCommentThreadModal = makeModalSetter("CommentThread")
	const setChangedFilesModal = makeModalSetter("ChangedFiles")
	const setSubmitReviewModal = makeModalSetter("SubmitReview")
	const setThemeModal = makeModalSetter("Theme")
	const setCommandPalette = makeModalSetter("CommandPalette")
	const setOpenRepositoryModal = makeModalSetter("OpenRepository")
	const setLabelCache = useAtomSet(labelCacheAtom)
	const setPullRequestOverrides = useAtomSet(pullRequestOverridesAtom)
	const setIssueOverrides = useAtomSet(issueOverridesAtom)
	const setRecentlyCompletedPullRequests = useAtomSet(recentlyCompletedPullRequestsAtom)
	const retryProgress = useAtomValue(retryProgressAtom)
	const [refreshCompletionMessage, setRefreshCompletionMessage] = useState<string | null>(null)
	const [refreshStartedAt, setRefreshStartedAt] = useState<number | null>(null)
	const [startupLoadComplete, setStartupLoadComplete] = useState(false)
	const [loadingMoreKey, setLoadingMoreKey] = useState<string | null>(null)
	const usernameResult = useAtomValue(usernameAtom)
	const loadRepoLabels = useAtomSet(listRepoLabelsAtom, { mode: "promise" })
	const loadPullRequestPage = useAtomSet(listOpenPullRequestPageAtom, { mode: "promise" })
	const addPullRequestLabel = useAtomSet(addPullRequestLabelAtom, { mode: "promise" })
	const removePullRequestLabel = useAtomSet(removePullRequestLabelAtom, { mode: "promise" })
	const addIssueLabel = useAtomSet(addIssueLabelAtom, { mode: "promise" })
	const removeIssueLabel = useAtomSet(removeIssueLabelAtom, { mode: "promise" })
	const toggleDraftStatus = useAtomSet(toggleDraftAtom, { mode: "promise" })
	const listPullRequestReviewComments = useAtomSet(listPullRequestReviewCommentsAtom, { mode: "promise" })
	const listPullRequestComments = useAtomSet(listPullRequestCommentsAtom, { mode: "promise" })
	const listIssueComments = useAtomSet(listIssueCommentsAtom, { mode: "promise" })
	const readCachedPullRequest = useAtomSet(readCachedPullRequestAtom, { mode: "promise" })
	const writeCachedPullRequest = useAtomSet(writeCachedPullRequestAtom, { mode: "promise" })
	const writeQueueCache = useAtomSet(writeQueueCacheAtom, { mode: "promise" })
	const readWorkspacePreferences = useAtomSet(readWorkspacePreferencesAtom, { mode: "promise" })
	const writeWorkspacePreferences = useAtomSet(writeWorkspacePreferencesAtom, { mode: "promise" })
	const pruneCache = useAtomSet(pruneCacheAtom, { mode: "promise" })
	const closePullRequest = useAtomSet(closePullRequestAtom, { mode: "promise" })
	const createPullRequestComment = useAtomSet(createPullRequestCommentAtom, { mode: "promise" })
	const createPullRequestIssueComment = useAtomSet(createPullRequestIssueCommentAtom, { mode: "promise" })
	const replyToReviewComment = useAtomSet(replyToReviewCommentAtom, { mode: "promise" })
	const editPullRequestIssueComment = useAtomSet(editPullRequestIssueCommentAtom, { mode: "promise" })
	const editReviewComment = useAtomSet(editReviewCommentAtom, { mode: "promise" })
	const deletePullRequestIssueComment = useAtomSet(deletePullRequestIssueCommentAtom, { mode: "promise" })
	const deleteReviewComment = useAtomSet(deleteReviewCommentAtom, { mode: "promise" })
	const submitPullRequestReview = useAtomSet(submitPullRequestReviewAtom, { mode: "promise" })
	const copyToClipboard = useAtomSet(copyToClipboardAtom, { mode: "promise" })
	const openInBrowser = useAtomSet(openInBrowserAtom, { mode: "promise" })
	const openUrl = useAtomSet(openUrlAtom, { mode: "promise" })
	const terminalWidth = width ?? 100
	const terminalHeight = height ?? 24
	const contentWidth = Math.max(1, terminalWidth)
	const isWideLayout = terminalWidth >= 100
	const splitGap = 1
	const sectionPadding = 1
	const leftPaneWidth = isWideLayout ? Math.max(44, Math.floor((contentWidth - splitGap) * 0.56)) : contentWidth
	const rightPaneWidth = isWideLayout ? Math.max(28, contentWidth - leftPaneWidth - splitGap) : contentWidth
	const dividerJunctionAt = Math.max(1, leftPaneWidth)
	const leftContentWidth = isWideLayout ? Math.max(24, leftPaneWidth - 2) : Math.max(24, contentWidth - sectionPadding * 2)
	const rightContentWidth = isWideLayout ? Math.max(24, rightPaneWidth - sectionPadding * 2) : Math.max(24, contentWidth - sectionPadding * 2)
	const wideDetailLines = Math.max(8, terminalHeight - 10)
	const showWorkspaceTabs = !detailFullView && !diffFullView && !commentsViewActive
	const wideBodyHeight = Math.max(8, terminalHeight - (showWorkspaceTabs ? 6 : 4))
	const detailPrefetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const detailHydrationRef = useRef(new Map<string, DetailHydration>())
	const refreshGenerationRef = useRef(0)
	const didMountQueueModeRef = useRef(false)
	const lastPullRequestRefreshAtRef = useRef(0)
	const pullRequestStatusRef = useRef<LoadStatus>("loading")
	const refreshPullRequestsRef = useRef<(message?: string, options?: { readonly resetTransientState?: boolean }) => void>(() => {})
	const maybeRefreshPullRequestsRef = useRef<(minimumAgeMs: number) => void>(() => {})
	const detailScrollRef = useRef<ScrollBoxRenderable | null>(null)
	const detailPreviewScrollRef = useRef<ScrollBoxRenderable | null>(null)
	const cachedDetailKeysRef = useRef(new Set<string>())
	const diffScrollRef = useRef<ScrollBoxRenderable | null>(null)
	const prListScrollRef = useRef<ScrollBoxRenderable | null>(null)
	const issueListScrollRef = useRef<ScrollBoxRenderable | null>(null)
	const suppressNextDiffCommentScrollRef = useRef(false)
	const headerFooterWidth = Math.max(24, contentWidth - 2)

	const flashNotice = useFlashNotice()

	useEffect(() => {
		renderer.setBackgroundColor(colors.background)
	}, [renderer, themeId, systemThemeGeneration])

	const themeModalActions = useThemeModal({ themeModal, setThemeModal, closeActiveModal, flashNotice })

	useEffect(
		() => () => {
			refreshGenerationRef.current += 1
			detailHydrationRef.current.clear()
			if (detailPrefetchTimeoutRef.current !== null) {
				clearTimeout(detailPrefetchTimeoutRef.current)
			}
		},
		[],
	)

	const pullRequestLoad = useAtomValue(pullRequestLoadAtom)
	const [activeWorkspaceSurface, setActiveWorkspaceSurface] = useAtom(workspaceSurfaceAtom)
	const [selectedRepositoryIndex, setSelectedRepositoryIndex] = useAtom(selectedRepositoryIndexAtom)
	const [favoriteRepositories, setFavoriteRepositories] = useAtom(favoriteRepositoriesAtom)
	const [recentRepositories, setRecentRepositories] = useAtom(recentRepositoriesAtom)
	const issuesResult = useAtomValue(issuesAtom)
	const [selectedIssueIndex, setSelectedIssueIndex] = useAtom(selectedIssueIndexAtom)
	const pullRequests = useAtomValue(displayedPullRequestsAtom)
	const pullRequestStatus = useAtomValue(pullRequestStatusAtom)
	const selectedRepository = viewRepository(activeView)
	const isInitialLoading = !startupLoadComplete && pullRequestStatus === "loading" && pullRequests.length === 0
	const pullRequestError = AsyncResult.isFailure(pullRequestResult) ? errorMessage(Cause.squash(pullRequestResult.cause)) : null
	const issueOverrides = useAtomValue(issueOverridesAtom)
	const visibleFilterText = filterMode ? filterDraft : filterQuery
	const rawIssues = selectedRepository === null && mockPrCount !== null ? mockUserIssues : AsyncResult.isSuccess(issuesResult) ? issuesResult.value : []
	const allIssues = rawIssues.map((issue) => issueOverrides[issue.url] ?? issue)
	const issues = useMemo(
		() => (activeWorkspaceSurface === "issues" ? filterByScore(allIssues, visibleFilterText, issueFilterScore, (issue) => issue.updatedAt.getTime()) : allIssues),
		[activeWorkspaceSurface, allIssues, visibleFilterText],
	)
	const issuesStatus: LoadStatus = selectedRepository === null ? "ready" : issuesResult.waiting ? "loading" : AsyncResult.isFailure(issuesResult) ? "error" : "ready"
	const issuesError = AsyncResult.isFailure(issuesResult) ? errorMessage(Cause.squash(issuesResult.cause)) : null
	const selectedIssue = issues[Math.max(0, Math.min(selectedIssueIndex, issues.length - 1))] ?? null
	const username = AsyncResult.isSuccess(usernameResult) ? usernameResult.value : null
	pullRequestStatusRef.current = pullRequestStatus

	const visibleGroups = useAtomValue(visibleGroupsAtom)
	const visiblePullRequests = useAtomValue(visiblePullRequestsAtom)
	const selectedPullRequest = useAtomValue(selectedPullRequestAtom)
	const workspaceTabSurfaces: readonly WorkspaceSurface[] = selectedRepository ? repositoryWorkspaceSurfaces : userWorkspaceSurfaces
	const allRepositoryItems = useMemo((): readonly RepositoryListItem[] => {
		const byRepository = new Map<string, RepositoryListItem>()
		const catalog = new Map(mockRepositoryCatalog.map((item) => [item.repository, item]))
		const ensure = (repository: string): RepositoryListItem => {
			const existing = byRepository.get(repository)
			if (existing) return existing
			const catalogItem = catalog.get(repository)
			const item: RepositoryListItem = {
				repository,
				pullRequestCount: catalogItem?.pullRequestCount ?? 0,
				issueCount: catalogItem?.issueCount ?? 0,
				favorite: favoriteRepositories[repository] === true,
				recent: recentRepositories.includes(repository),
				lastActivityAt: null,
				description: catalogItem?.description ?? null,
			}
			byRepository.set(repository, item)
			return item
		}
		for (const repository of [...recentRepositories, ...Object.keys(favoriteRepositories), ...(detectedRepository ? [detectedRepository] : [])]) {
			ensure(repository)
		}
		const touch = (repository: string, at: Date, description: string | null, counts: Pick<RepositoryListItem, "pullRequestCount" | "issueCount">) => {
			const current = ensure(repository)
			byRepository.set(repository, {
				...current,
				pullRequestCount: current.pullRequestCount + counts.pullRequestCount,
				issueCount: current.issueCount + counts.issueCount,
				lastActivityAt: current.lastActivityAt && current.lastActivityAt > at ? current.lastActivityAt : at,
				description: current.description ?? description,
			})
		}
		for (const pullRequest of pullRequests) {
			touch(pullRequest.repository, pullRequest.createdAt, pullRequest.title, { pullRequestCount: 1, issueCount: 0 })
		}
		for (const issue of allIssues) {
			touch(issue.repository, issue.updatedAt, issue.title, { pullRequestCount: 0, issueCount: 1 })
		}
		return [...byRepository.values()].sort((left, right) => {
			if (left.favorite !== right.favorite) return left.favorite ? -1 : 1
			if (left.recent !== right.recent) return left.recent ? -1 : 1
			const leftTime = left.lastActivityAt?.getTime() ?? 0
			const rightTime = right.lastActivityAt?.getTime() ?? 0
			return rightTime - leftTime || left.repository.localeCompare(right.repository)
		})
	}, [favoriteRepositories, recentRepositories, pullRequests, allIssues])
	const repositoryItems = useMemo(
		() => (activeWorkspaceSurface === "repos" ? allRepositoryItems.filter((repository) => repositoryFilterScore(repository, visibleFilterText) !== null) : allRepositoryItems),
		[activeWorkspaceSurface, allRepositoryItems, visibleFilterText],
	)
	const selectedRepositoryItem = repositoryItems[Math.max(0, Math.min(selectedRepositoryIndex, repositoryItems.length - 1))] ?? null
	const pullRequestComments = useAtomValue(pullRequestCommentsAtom)
	const pullRequestCommentsLoaded = useAtomValue(pullRequestCommentsLoadedAtom)
	const activeViews = activePullRequestViews(activeView)
	const currentQueueCacheKey = viewCacheKey(activeView)
	const loadedPullRequestCount = pullRequestLoad?.data.length ?? 0
	const hasMorePullRequests = Boolean(pullRequestLoad?.hasNextPage && loadedPullRequestCount < config.prFetchLimit)
	const isLoadingMorePullRequests = loadingMoreKey === currentQueueCacheKey
	const pullRequestListRows = useMemo(
		() =>
			buildPullRequestListRows({
				groups: visibleGroups,
				status: pullRequestStatus,
				error: pullRequestError,
				filterText: visibleFilterText,
				showFilterBar: filterMode || filterQuery.length > 0,
				loadedCount: loadedPullRequestCount,
				hasMore: hasMorePullRequests,
				isLoadingMore: isLoadingMorePullRequests,
			}),
		[visibleGroups, pullRequestStatus, pullRequestError, visibleFilterText, filterMode, filterQuery, loadedPullRequestCount, hasMorePullRequests, isLoadingMorePullRequests],
	)
	const selectedPullRequestRowIndex = pullRequestListRowIndex(pullRequestListRows, selectedPullRequest?.url ?? null)
	const selectedDiffKey = useAtomValue(selectedDiffKeyAtom)
	const selectedCommentSubject = activeWorkspaceSurface === "issues" ? selectedIssue : activeWorkspaceSurface === "pullRequests" ? selectedPullRequest : null
	const selectedCommentKey =
		activeWorkspaceSurface === "issues"
			? selectedIssue
				? `issue:${selectedIssue.repository}#${selectedIssue.number}`
				: null
			: activeWorkspaceSurface === "pullRequests" && selectedPullRequest
				? pullRequestDiffKey(selectedPullRequest)
				: null
	const selectedItemLabels = selectedCommentSubject?.labels ?? []
	// Stabilize the reference so the orderedComments memo only refires when the
	// underlying comment array actually changes (not every App re-render).
	const selectedComments = useMemo(() => (selectedCommentKey ? (pullRequestComments[selectedCommentKey] ?? []) : []), [selectedCommentKey, pullRequestComments])
	const selectedCommentsStatus: DetailCommentsStatus = selectedCommentKey ? (pullRequestCommentsLoaded[selectedCommentKey] ?? "idle") : "idle"
	const selectedCommentCount = activeWorkspaceSurface === "issues" ? Math.max(selectedIssue?.commentCount ?? 0, selectedComments.length) : selectedComments.length
	const selectedDiffState = useAtomValue(selectedDiffStateAtom)
	const effectiveDiffRenderView = contentWidth >= 100 ? diffRenderView : "unified"
	const readyDiffFiles = useMemo(
		() => (selectedDiffState?._tag === "Ready" ? (diffWhitespaceMode === "ignore" ? minimizeWhitespaceDiffFiles(selectedDiffState.files) : selectedDiffState.files) : []),
		[selectedDiffState, diffWhitespaceMode],
	)
	const changedFileResults = useMemo(
		() => (changedFilesModalActive ? filterChangedFiles(readyDiffFiles, changedFilesModal.query) : []),
		[changedFilesModalActive, readyDiffFiles, changedFilesModal.query],
	)
	const displayedDiffState = useMemo(
		() =>
			selectedDiffState?._tag === "Ready" ? PullRequestDiffState.Ready({ patch: readyDiffFiles.map((file) => file.patch).join("\n"), files: readyDiffFiles }) : selectedDiffState,
		[selectedDiffState, readyDiffFiles],
	)
	const stackedDiffFiles = useMemo(
		() => buildStackedDiffFiles(readyDiffFiles, effectiveDiffRenderView, diffWrapMode, contentWidth),
		[readyDiffFiles, effectiveDiffRenderView, diffWrapMode, contentWidth],
	)
	const diffCommentAnchors = useMemo(
		() => (diffFullView ? getStackedDiffCommentAnchors(stackedDiffFiles, effectiveDiffRenderView, diffWrapMode, contentWidth) : []),
		[diffFullView, stackedDiffFiles, effectiveDiffRenderView, diffWrapMode, contentWidth],
	)
	const selectedDiffCommentAnchorIndex = Math.max(0, Math.min(diffCommentAnchorIndex, diffCommentAnchors.length - 1))
	const selectedDiffCommentAnchor = diffCommentAnchors[selectedDiffCommentAnchorIndex] ?? null
	const diffCommentRangeStartAnchor =
		diffCommentRangeStartIndex === null ? null : (diffCommentAnchors[Math.max(0, Math.min(diffCommentRangeStartIndex, diffCommentAnchors.length - 1))] ?? null)
	const selectedDiffCommentRange = useMemo(
		() => diffCommentRangeSelection(diffCommentRangeStartAnchor, selectedDiffCommentAnchor),
		[diffCommentRangeStartAnchor, selectedDiffCommentAnchor],
	)
	const selectedDiffCommentRangeAnchors = useMemo(
		() => (selectedDiffCommentRange ? diffCommentAnchors.filter((anchor) => diffCommentRangeContains(selectedDiffCommentRange, anchor)) : []),
		[diffCommentAnchors, selectedDiffCommentRange],
	)
	const diffCommentRangeActive = selectedDiffCommentRange !== null
	const selectedDiffCommentLabel = selectedDiffCommentRange
		? diffCommentRangeLabel(selectedDiffCommentRange)
		: selectedDiffCommentAnchor
			? diffCommentAnchorLabel(selectedDiffCommentAnchor)
			: null
	const selectedDiffCommentThreadKey = selectedDiffKey && selectedDiffCommentAnchor ? diffCommentThreadMapKey(selectedDiffKey, selectedDiffCommentAnchor) : null
	const selectedDiffCommentThread = selectedDiffCommentThreadKey ? (diffCommentThreads[selectedDiffCommentThreadKey] ?? []) : []
	const diffLineColorContextKey = selectedDiffKey ? `${selectedDiffKey}:${effectiveDiffRenderView}:${diffWrapMode}:${diffWhitespaceMode}` : null
	const diffCommentThreadAnchors = useMemo(() => {
		if (!selectedDiffKey) return [] as readonly StackedDiffCommentAnchor[]
		const seen = new Set<string>()
		return diffCommentAnchors.filter((anchor) => {
			const key = diffCommentLocationKey(anchor)
			if (seen.has(key)) return false
			if ((diffCommentThreads[diffCommentThreadMapKey(selectedDiffKey, anchor)]?.length ?? 0) === 0) return false
			seen.add(key)
			return true
		})
	}, [diffCommentAnchors, diffCommentThreads, selectedDiffKey])
	const groupStarts = useAtomValue(groupStartsAtom)
	const getCurrentGroupIndex = (current: number) => {
		if (groupStarts.length === 0) return 0
		let low = 0
		let high = groupStarts.length - 1
		while (low < high) {
			const mid = (low + high + 1) >>> 1
			if (groupStarts[mid]! <= current) low = mid
			else high = mid - 1
		}
		return low
	}
	const summaryRight =
		activeWorkspaceSurface === "pullRequests" && pullRequestLoad?.fetchedAt
			? `updated ${formatShortDate(pullRequestLoad.fetchedAt)} ${formatTimestamp(pullRequestLoad.fetchedAt)}`
			: activeWorkspaceSurface === "pullRequests" && pullRequestStatus === "loading"
				? "loading pull requests..."
				: ""
	const headerLeft = selectedRepository ?? username ?? viewLabel(activeView)
	const headerLine = `${fitCell(headerLeft, Math.max(0, headerFooterWidth - summaryRight.length))}${summaryRight}`
	const footerNotice = notice ? fitCell(notice, headerFooterWidth) : null
	const selectPullRequestByUrl = (url: string) => {
		const index = visiblePullRequests.findIndex((pullRequest) => pullRequest.url === url)
		if (index >= 0) {
			setSelectedIndex(index)
			setQueueSelection((current) => ({ ...current, [currentQueueCacheKey]: index }))
		}
	}
	const updatePullRequest = (url: string, transform: (pullRequest: PullRequestItem) => PullRequestItem) => {
		const pullRequest = pullRequests.find((item) => item.url === url)
		if (!pullRequest) return
		setPullRequestOverrides((current) => ({ ...current, [url]: transform(pullRequest) }))
	}
	const updateIssue = (url: string, transform: (issue: IssueItem) => IssueItem) => {
		const issue = issues.find((item) => item.url === url)
		if (!issue) return
		setIssueOverrides((current) => ({ ...current, [url]: transform(issue) }))
	}
	const markPullRequestCompleted = (pullRequest: PullRequestItem, state: "closed" | "merged") => {
		setRecentlyCompletedPullRequests((current) => ({
			...current,
			[pullRequest.url]: {
				...pullRequest,
				state,
				autoMergeEnabled: false,
			},
		}))
	}
	const restoreOptimisticPullRequest = (pullRequest: PullRequestItem) => {
		setRecentlyCompletedPullRequests((current) => {
			if (!(pullRequest.url in current)) return current
			const next = { ...current }
			delete next[pullRequest.url]
			return next
		})
		updatePullRequest(pullRequest.url, () => pullRequest)
	}
	const refreshPullRequests = (message?: string, options: { readonly resetTransientState?: boolean } = {}) => {
		refreshGenerationRef.current += 1
		detailHydrationRef.current.clear()
		if (detailPrefetchTimeoutRef.current !== null) clearTimeout(detailPrefetchTimeoutRef.current)
		setLoadingMoreKey(null)
		setPullRequestOverrides({})
		if (options.resetTransientState) {
			setRecentlyCompletedPullRequests({})
			setPullRequestComments({})
			setPullRequestCommentsLoaded({})
		}
		if (message) {
			setNotice(null)
			setRefreshCompletionMessage(message)
			setRefreshStartedAt(lastPullRequestRefreshAtRef.current)
		}
		refreshPullRequestsAtom()
	}
	refreshPullRequestsRef.current = refreshPullRequests
	const switchViewTo = (view: PullRequestView) => {
		if (viewEquals(view, activeView)) return
		refreshGenerationRef.current += 1
		setQueueSelection((current) => ({ ...current, [currentQueueCacheKey]: selectedIndex }))
		setActiveView(view)
		setSelectedIndex(registry.get(queueSelectionAtom)[viewCacheKey(view)] ?? 0)
		setSelectedIssueIndex(0)
		setRecentlyCompletedPullRequests({})
		detailHydrationRef.current.clear()
		if (detailPrefetchTimeoutRef.current !== null) clearTimeout(detailPrefetchTimeoutRef.current)
		setLoadingMoreKey(null)
		setDetailFullView(false)
		setDiffFullView(false)
		setDiffCommentRangeStartIndex(null)
		setFilterDraft(filterQuery)
		setNotice(null)
		setRefreshCompletionMessage(null)
		setRefreshStartedAt(null)
		if (view._tag === "Repository") {
			setRecentRepositories((current) => [view.repository, ...current.filter((repository) => repository !== view.repository)].slice(0, 12))
			if (activeWorkspaceSurface === "repos") setActiveWorkspaceSurface("pullRequests")
		} else if (view.repository === null && selectedRepository !== null) {
			setActiveWorkspaceSurface("repos")
		}
	}
	const switchQueueMode = (delta: 1 | -1) => {
		switchViewTo(nextView(activeView, activeViews, delta))
	}
	const switchWorkspaceSurface = (surface: WorkspaceSurface) => {
		if (!workspaceTabSurfaces.includes(surface)) return
		if (surface === activeWorkspaceSurface) return
		setActiveWorkspaceSurface(surface)
		setSelectedIssueIndex(0)
		setDetailFullView(false)
		setDiffFullView(false)
		setCommentsViewActive(false)
		setDiffCommentRangeStartIndex(null)
		setFilterMode(false)
		setFilterDraft(filterQuery)
		setNotice(null)
	}
	const cycleWorkspaceSurface = (delta: 1 | -1) => {
		switchWorkspaceSurface(nextWorkspaceSurface(activeWorkspaceSurface, delta, workspaceTabSurfaces))
	}
	const goUpWorkspaceScope = () => {
		if (!selectedRepository) return false
		switchViewTo({ _tag: "Queue", mode: "authored", repository: null })
		return true
	}
	const openSelectedRepository = () => {
		if (!selectedRepositoryItem) return
		switchViewTo({ _tag: "Repository", repository: selectedRepositoryItem.repository })
	}
	const toggleFavoriteRepository = () => {
		if (!selectedRepositoryItem) return
		const repository = selectedRepositoryItem.repository
		setFavoriteRepositories((current) => {
			if (current[repository]) {
				const next = { ...current }
				delete next[repository]
				return next
			}
			return { ...current, [repository]: true }
		})
	}
	const loadMorePullRequests = () => {
		if (!pullRequestLoad || !hasMorePullRequests || isLoadingMorePullRequests || !pullRequestLoad.endCursor) return false
		const remaining = config.prFetchLimit - pullRequestLoad.data.length
		if (remaining <= 0) return false
		const cacheKey = currentQueueCacheKey
		const generation = refreshGenerationRef.current
		setLoadingMoreKey(cacheKey)
		void loadPullRequestPage({
			mode: viewMode(activeView),
			repository: selectedRepository,
			cursor: pullRequestLoad.endCursor,
			pageSize: Math.min(pullRequestPageSize, remaining),
		})
			.then((page) => {
				if (generation !== refreshGenerationRef.current) return
				const currentLoad = registry.get(queueLoadCacheAtom)[cacheKey]
				if (!currentLoad) return
				const data = appendPullRequestPage(currentLoad.data, page.items)
				const persistedLoad: PullRequestLoad = {
					...currentLoad,
					data,
					endCursor: page.endCursor,
					hasNextPage: page.hasNextPage && data.length < config.prFetchLimit,
				}
				setQueueLoadCache((current) => {
					if (!current[cacheKey]) return current
					return {
						...current,
						[cacheKey]: persistedLoad,
					}
				})
				const viewer = cacheViewerFor(activeView, username)
				if (viewer) void writeQueueCache({ viewer, load: persistedLoad }).catch(() => {})
			})
			.catch((error) => {
				flashNotice(errorMessage(error))
			})
			.finally(() => {
				setLoadingMoreKey((current) => (current === cacheKey ? null : current))
			})
		return true
	}
	const applyPullRequestDetail = (detail: PullRequestItem) => {
		setQueueLoadCache((current) => {
			const next = { ...current }
			let changed = false
			for (const [cacheKey, load] of Object.entries(current)) {
				if (!load) continue
				const index = load.data.findIndex((pullRequest) => pullRequest.url === detail.url)
				if (index < 0) continue
				const data = [...load.data]
				data[index] = detail
				changed = true
				next[cacheKey] = { ...load, data }
			}
			return changed ? next : current
		})
	}
	const hydratePullRequestDetails = (pullRequest: PullRequestItem, notifyError: boolean) => {
		if (pullRequest.state !== "open") return false
		const detailKey = pullRequestDetailKey(pullRequest)
		const forceRefresh = notifyError && pullRequest.detailLoaded && cachedDetailKeysRef.current.has(detailKey)
		if (pullRequest.detailLoaded && !forceRefresh) return false
		const existing = detailHydrationRef.current.get(detailKey)
		if (existing) {
			if (notifyError) existing.notifyError = true
			return false
		}
		if (!notifyError && detailHydrationRef.current.size >= DETAIL_PREFETCH_CONCURRENCY) return false
		const entry: DetailHydration = { token: Symbol(detailKey), notifyError }
		detailHydrationRef.current.set(detailKey, entry)
		const generation = refreshGenerationRef.current
		if (!pullRequest.detailLoaded) {
			void readCachedPullRequest({ repository: pullRequest.repository, number: pullRequest.number })
				.then((cached) => {
					if (!cached || !cached.detailLoaded || cached.headRefOid !== pullRequest.headRefOid) return
					if (generation !== refreshGenerationRef.current || detailHydrationRef.current.get(detailKey) !== entry) return
					cachedDetailKeysRef.current.add(detailKey)
					applyPullRequestDetail(cached)
				})
				.catch(() => {})
		}
		const atom = pullRequestDetailsAtom(pullRequestRevisionAtomKey(pullRequest))
		if (forceRefresh) registry.refresh(atom)
		void Effect.runPromise(AtomRegistry.getResult(registry, atom, { suspendOnWaiting: true }))
			.then((detail) => {
				if (generation === refreshGenerationRef.current && detailHydrationRef.current.get(detailKey) === entry) {
					cachedDetailKeysRef.current.delete(detailKey)
					applyPullRequestDetail(detail)
					void writeCachedPullRequest(detail).catch(() => {})
				}
			})
			.catch((error) => {
				if (entry.notifyError && generation === refreshGenerationRef.current && detailHydrationRef.current.get(detailKey) === entry) flashNotice(errorMessage(error))
			})
			.finally(() => {
				if (detailHydrationRef.current.get(detailKey) === entry) detailHydrationRef.current.delete(detailKey)
			})
		return true
	}
	const loadPullRequestComments = (pullRequest: PullRequestItem, force = false) => {
		const key = pullRequestDiffKey(pullRequest)
		const previousLoadState = registry.get(pullRequestCommentsLoadedAtom)[key]
		if (!force && previousLoadState) return
		const generation = refreshGenerationRef.current
		setPullRequestCommentsLoaded((current) => ({ ...current, [key]: "loading" }))
		void listPullRequestComments({ repository: pullRequest.repository, number: pullRequest.number })
			.then((items) => {
				if (generation !== refreshGenerationRef.current) return
				setPullRequestComments((current) => ({ ...current, [key]: items }))
				setPullRequestCommentsLoaded((current) => ({ ...current, [key]: "ready" }))
			})
			.catch((error) => {
				if (generation !== refreshGenerationRef.current) return
				setPullRequestCommentsLoaded((current) => {
					if (previousLoadState === "ready") return { ...current, [key]: previousLoadState }
					const next = { ...current }
					delete next[key]
					return next
				})
				flashNotice(errorMessage(error))
			})
	}
	const loadIssueComments = (issue: IssueItem, force = false) => {
		const key = `issue:${issue.repository}#${issue.number}`
		const previousLoadState = registry.get(pullRequestCommentsLoadedAtom)[key]
		if (!force && previousLoadState) return
		const generation = refreshGenerationRef.current
		setPullRequestCommentsLoaded((current) => ({ ...current, [key]: "loading" }))
		void listIssueComments({ repository: issue.repository, number: issue.number })
			.then((items) => {
				if (generation !== refreshGenerationRef.current) return
				setPullRequestComments((current) => ({ ...current, [key]: items }))
				setPullRequestCommentsLoaded((current) => ({ ...current, [key]: "ready" }))
			})
			.catch((error) => {
				if (generation !== refreshGenerationRef.current) return
				setPullRequestCommentsLoaded((current) => {
					if (previousLoadState === "ready") return { ...current, [key]: previousLoadState }
					const next = { ...current }
					delete next[key]
					return next
				})
				flashNotice(errorMessage(error))
			})
	}
	maybeRefreshPullRequestsRef.current = (minimumAgeMs) => {
		if (!terminalFocusedRef.current || pullRequestStatusRef.current === "loading") return
		const lastRefreshAt = lastPullRequestRefreshAtRef.current
		if (lastRefreshAt > 0 && Date.now() - lastRefreshAt < minimumAgeMs) return
		refreshPullRequestsRef.current()
	}

	useEffect(() => {
		const fetchedAt = pullRequestLoad?.fetchedAt?.getTime()
		if (fetchedAt !== undefined) {
			lastPullRequestRefreshAtRef.current = fetchedAt
		}
	}, [pullRequestLoad?.fetchedAt])

	useEffect(() => {
		if (!didMountQueueModeRef.current) {
			didMountQueueModeRef.current = true
			return
		}
		if (registry.get(queueLoadCacheAtom)[currentQueueCacheKey]) return
		refreshPullRequestsAtom()
	}, [currentQueueCacheKey, refreshPullRequestsAtom, registry])

	useEffect(() => {
		if (!refreshCompletionMessage || refreshStartedAt === null) return
		const fetchedAt = pullRequestLoad?.fetchedAt?.getTime()
		const isHydratingDetails = pullRequestStatus === "ready" && selectedPullRequest?.state === "open" && !selectedPullRequest.detailLoaded
		if (pullRequestStatus === "ready" && fetchedAt !== undefined && fetchedAt !== refreshStartedAt && !isHydratingDetails) {
			flashNotice(`✓ ${refreshCompletionMessage}`)
			setRefreshCompletionMessage(null)
			setRefreshStartedAt(null)
		} else if (pullRequestStatus === "error" || pullRequestError) {
			flashNotice(pullRequestLoad ? "Refresh failed; showing cached data" : "Refresh failed")
			setRefreshCompletionMessage(null)
			setRefreshStartedAt(null)
		}
	}, [refreshCompletionMessage, refreshStartedAt, pullRequestStatus, pullRequestError, pullRequestLoad?.fetchedAt, pullRequests])

	// Best-effort startup prune: writeQueue prunes after each successful refresh,
	// but a session that only browses cached state (or stays offline) never prunes.
	// Firing once at mount keeps the cache bounded for those sessions.
	useEffect(() => {
		void pruneCache().catch(() => {})
	}, [pruneCache])

	const { terminalFocused, terminalFocusedRef } = useTerminalFocus({
		renderer,
		onFocusReturn: () => maybeRefreshPullRequestsRef.current(FOCUS_RETURN_REFRESH_MIN_MS),
	})

	useIdleRefresh({
		enabled: terminalFocused,
		lastRefreshAtRef: lastPullRequestRefreshAtRef,
		idleAfterMs: FOCUSED_IDLE_REFRESH_MS,
		jitterMs: AUTO_REFRESH_JITTER_MS,
		onRefresh: (ms) => maybeRefreshPullRequestsRef.current(ms),
		refreshGeneration: pullRequestLoad?.fetchedAt?.getTime(),
	})

	useClampedIndex(visiblePullRequests.length, setSelectedIndex)
	useClampedIndex(issues.length, setSelectedIssueIndex)
	useClampedIndex(repositoryItems.length, setSelectedRepositoryIndex)

	useWorkspacePreferencesPersistence({
		username,
		favoriteRepositories,
		recentRepositories,
		mockPath: mockWorkspacePreferencesPath,
		readPreferences: readWorkspacePreferences,
		writePreferences: writeWorkspacePreferences,
		setFavoriteRepositories,
		setRecentRepositories,
	})

	useEffect(() => {
		setQueueSelection((current) => (current[currentQueueCacheKey] === selectedIndex ? current : { ...current, [currentQueueCacheKey]: selectedIndex }))
	}, [currentQueueCacheKey, selectedIndex])

	useEffect(() => {
		if (filterMode || filterQuery.length > 0 || visiblePullRequests.length === 0) return
		const thresholdIndex = Math.max(0, visiblePullRequests.length - LOAD_MORE_SELECTION_THRESHOLD)
		if (selectedIndex >= thresholdIndex) loadMorePullRequests()
	}, [selectedIndex, visiblePullRequests.length, filterMode, filterQuery, hasMorePullRequests, isLoadingMorePullRequests, currentQueueCacheKey])

	useEffect(() => {
		if (filterMode || filterQuery.length > 0 || visiblePullRequests.length === 0 || detailFullView || diffFullView) return
		if (!hasMorePullRequests || isLoadingMorePullRequests) return
		const checkScroll = () => {
			const scroll = prListScrollRef.current
			if (!scroll || scroll.viewport.height <= 0) return
			const bottom = scroll.scrollTop + scroll.viewport.height
			if (bottom >= scroll.scrollHeight - LOAD_MORE_SCROLL_THRESHOLD) loadMorePullRequests()
		}
		checkScroll()
		const interval = globalThis.setInterval(checkScroll, 120)
		return () => globalThis.clearInterval(interval)
	}, [visiblePullRequests.length, filterMode, filterQuery, detailFullView, diffFullView, hasMorePullRequests, isLoadingMorePullRequests, currentQueueCacheKey])

	useScrollFollowSelected(prListScrollRef, selectedPullRequestRowIndex)
	useScrollFollowSelected(issueListScrollRef, issues.length === 0 ? null : selectedIssueIndex)

	useEffect(() => {
		setDiffFileIndex(0)
		setDiffScrollTop(0)
		setDiffCommentAnchorIndex(0)
		setDiffPreferredSide(null)
		setDiffCommentRangeStartIndex(null)
		detailPreviewScrollRef.current?.scrollTo({ x: 0, y: 0 })
	}, [selectedIndex])

	useEffect(() => {
		detailPreviewScrollRef.current?.scrollTo({ x: 0, y: 0 })
	}, [selectedIssueIndex, selectedRepositoryIndex, activeWorkspaceSurface])

	useEffect(() => {
		setDiffFileIndex((current) => safeDiffFileIndex(readyDiffFiles, current))
	}, [readyDiffFiles.length])

	useEffect(() => {
		setDiffCommentAnchorIndex((current) => {
			if (diffCommentAnchors.length === 0) return 0
			return Math.max(0, Math.min(current, diffCommentAnchors.length - 1))
		})
		setDiffCommentRangeStartIndex((current) => {
			if (current === null || diffCommentAnchors.length === 0) return null
			return Math.max(0, Math.min(current, diffCommentAnchors.length - 1))
		})
	}, [diffCommentAnchors.length])

	useEffect(() => {
		if (!diffFullView || !selectedDiffCommentAnchor) return
		setDiffFileIndex((current) => (current === selectedDiffCommentAnchor.fileIndex ? current : selectedDiffCommentAnchor.fileIndex))
	}, [diffFullView, selectedDiffCommentAnchor?.fileIndex])

	const { preserveCurrentDiffLocation } = useDiffLocationPreservation({
		diffFullView,
		selectedDiffCommentAnchor,
		diffCommentAnchors,
		diffWhitespaceMode,
		diffScrollRef,
		wideBodyHeight,
		suppressNextDiffCommentScrollRef,
		setDiffCommentAnchorIndex,
		setDiffFileIndex,
		syncDiffScrollState: () => syncDiffScrollState(),
	})

	const { setDiffRenderableRef, resetDiffLineColors } = useDiffLineColors({
		diffLineColorContextKey,
		effectiveDiffRenderView,
		selectedDiffCommentAnchor,
		selectedDiffCommentRangeAnchors,
		diffCommentThreadAnchors,
		suppressNextDiffCommentScrollRef,
		ensureDiffLineVisible: (line) => ensureDiffLineVisible(line),
	})

	// Scroll the selected line into view when the diff view is opened. Previously
	// opentui's `focused` scrollbox did this auto-scroll on mount; with the keymap
	// migration the scrollbox is `focusable={false}` so we have to scroll explicitly.
	useEffect(() => {
		if (!diffFullView) return
		if (!selectedDiffCommentAnchor) return
		ensureDiffLineVisible(selectedDiffCommentAnchor.renderLine)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [diffFullView])
	const isHydratingPullRequestDetails = pullRequestStatus === "ready" && selectedPullRequest?.state === "open" && !selectedPullRequest.detailLoaded
	const isRefreshingPullRequests = pullRequestResult.waiting && pullRequestLoad !== null
	const isActiveSurfaceLoading =
		(activeWorkspaceSurface === "pullRequests" && (pullRequestStatus === "loading" || isRefreshingPullRequests || isHydratingPullRequestDetails || isLoadingMorePullRequests)) ||
		(activeWorkspaceSurface === "issues" && issuesStatus === "loading")
	const hasActiveLoadingIndicator =
		pullRequestResult.waiting ||
		isHydratingPullRequestDetails ||
		isLoadingMorePullRequests ||
		selectedCommentsStatus === "loading" ||
		labelModal.loading ||
		closeModal.running ||
		pullRequestStateModal.running ||
		mergeModal.loading ||
		mergeModal.running ||
		submitReviewModal.running ||
		selectedDiffState?._tag === "Loading"
	const loadingFrame = useSpinnerFrame({ active: hasActiveLoadingIndicator, reset: isInitialLoading })
	const loadingIndicator = SPINNER_FRAMES[loadingFrame % SPINNER_FRAMES.length]!

	useEffect(() => {
		if (startupLoadComplete || pullRequestStatus === "loading") return
		setStartupLoadComplete(true)
	}, [startupLoadComplete, pullRequestStatus])

	useEffect(() => {
		if (pullRequestStatus !== "ready" || !selectedPullRequest) return
		hydratePullRequestDetails(selectedPullRequest, true)
	}, [
		pullRequestStatus,
		selectedPullRequest?.url,
		selectedPullRequest?.headRefOid,
		selectedPullRequest?.state,
		selectedPullRequest?.detailLoaded,
		selectedPullRequest?.repository,
		selectedPullRequest?.number,
	])

	useEffect(() => {
		if (pullRequestStatus !== "ready" || !selectedPullRequest) return
		loadPullRequestComments(selectedPullRequest)
	}, [pullRequestStatus, selectedPullRequest?.url, selectedPullRequest?.headRefOid, selectedPullRequest?.repository, selectedPullRequest?.number])

	useEffect(() => {
		if (detailPrefetchTimeoutRef.current !== null) clearTimeout(detailPrefetchTimeoutRef.current)
		if (pullRequestStatus !== "ready" || visiblePullRequests.length === 0) return
		detailPrefetchTimeoutRef.current = globalThis.setTimeout(() => {
			detailPrefetchTimeoutRef.current = null
			let started = 0
			for (let distance = 1; distance <= Math.max(DETAIL_PREFETCH_AHEAD, DETAIL_PREFETCH_BEHIND); distance++) {
				const offsets = [distance <= DETAIL_PREFETCH_AHEAD ? distance : null, distance <= DETAIL_PREFETCH_BEHIND ? -distance : null]
				for (const offset of offsets) {
					if (offset === null) continue
					if (started >= DETAIL_PREFETCH_CONCURRENCY) return
					const pullRequest = visiblePullRequests[selectedIndex + offset]
					if (pullRequest && hydratePullRequestDetails(pullRequest, false)) started += 1
				}
			}
		}, DETAIL_PREFETCH_DELAY_MS)
		return () => {
			if (detailPrefetchTimeoutRef.current !== null) clearTimeout(detailPrefetchTimeoutRef.current)
		}
	}, [pullRequestStatus, currentQueueCacheKey, selectedIndex, visiblePullRequests])

	const detailPlaceholderContent = getDetailPlaceholderContent({
		status: pullRequestStatus,
		retryProgress,
		loadingIndicator,
		visibleCount: visiblePullRequests.length,
		filterText: visibleFilterText,
	})
	const isSelectedPullRequestDetailLoading = selectedPullRequest !== null && !selectedPullRequest.detailLoaded
	const halfPage = Math.max(1, Math.floor(wideBodyHeight / 2))

	const loadPullRequestReviewComments = (pullRequest: PullRequestItem, force = false) => {
		const key = pullRequestDiffKey(pullRequest)
		const previousLoadState = registry.get(diffCommentsLoadedAtom)[key]
		if (!force && previousLoadState) return
		setDiffCommentsLoaded((current) => ({ ...current, [key]: "loading" }))
		void listPullRequestReviewComments({ repository: pullRequest.repository, number: pullRequest.number })
			.then((comments) => {
				setDiffCommentsLoaded((current) => ({ ...current, [key]: "ready" }))
				setDiffCommentThreads((current) => {
					const prefix = `${key}:`
					const threads = groupDiffCommentThreads(pullRequest, comments)
					const next: Record<string, readonly PullRequestReviewComment[]> = Object.fromEntries(Object.entries(current).filter(([threadKey]) => !threadKey.startsWith(prefix)))

					for (const [threadKey, threadComments] of Object.entries(current)) {
						if (!threadKey.startsWith(prefix)) continue
						const localComments = threadComments.filter(isLocalDiffComment)
						if (localComments.length > 0) {
							next[threadKey] = [...(threads[threadKey] ?? []), ...localComments]
						}
					}

					for (const [threadKey, threadComments] of Object.entries(threads)) {
						if (!next[threadKey]) next[threadKey] = threadComments
					}

					return next
				})
			})
			.catch((error) => {
				setDiffCommentsLoaded((current) => {
					if (previousLoadState === "ready") return { ...current, [key]: previousLoadState }
					const next = { ...current }
					delete next[key]
					return next
				})
				flashNotice(errorMessage(error))
			})
	}

	const loadPullRequestDiff = (pullRequest: PullRequestItem, options: { readonly force?: boolean; readonly includeComments?: boolean } = {}) => {
		const force = options.force ?? false
		const includeComments = options.includeComments ?? false
		const key = pullRequestDiffKey(pullRequest)
		const existing = registry.get(pullRequestDiffCacheAtom)[key]
		if (includeComments) loadPullRequestReviewComments(pullRequest, force)
		if (!force && existing && (existing._tag === "Ready" || existing._tag === "Loading")) return

		setPullRequestDiffCache((current) => ({ ...current, [key]: PullRequestDiffState.Loading() }))
		const atom = pullRequestDiffAtom(pullRequestRevisionAtomKey(pullRequest))
		if (force) registry.refresh(atom)
		void Effect.runPromise(AtomRegistry.getResult(registry, atom, { suspendOnWaiting: true }))
			.then((patch) => {
				setPullRequestDiffCache((current) => ({
					...current,
					[key]: PullRequestDiffState.Ready({ patch, files: splitPatchFiles(patch) }),
				}))
			})
			.catch((error) => {
				setPullRequestDiffCache((current) => ({
					...current,
					[key]: PullRequestDiffState.Error({ error: errorMessage(error) }),
				}))
				flashNotice(errorMessage(error))
			})
	}

	useDiffPrefetch({
		pullRequest: selectedPullRequest,
		skip: diffFullView,
		onPrefetch: (pr) => loadPullRequestDiff(pr),
	})

	const openDiffView = () => {
		if (!selectedPullRequest) return
		resetDiffLineColors()
		setDiffFullView(true)
		setDetailFullView(false)
		setCommentsViewActive(false)
		setDiffFileIndex(0)
		setDiffScrollTop(0)
		setDiffCommentAnchorIndex(0)
		setDiffPreferredSide(null)
		setDiffCommentRangeStartIndex(null)
		setDiffRenderView(contentWidth >= 100 ? "split" : "unified")
		diffScrollRef.current?.scrollTo({ x: 0, y: 0 })
		loadPullRequestDiff(selectedPullRequest, { includeComments: true })
	}

	const openCommentsView = () => {
		if (activeWorkspaceSurface === "issues") {
			if (!selectedIssue) return
			loadIssueComments(selectedIssue, true)
		} else {
			if (!selectedPullRequest) return
			loadPullRequestComments(selectedPullRequest, true)
		}
		setCommentsViewActive(true)
		setDetailFullView(false)
		setDiffFullView(false)
		setCommentsViewSelection(0)
	}

	const closeCommentsView = () => {
		setCommentsViewActive(false)
	}

	// j/k navigates the *visual* (threaded) order, not the raw load order — so
	// the comment under the cursor is the one immediately below the previously
	// highlighted row, regardless of where it lives in the flat array.
	const orderedComments = useMemo(() => orderCommentsForDisplay(selectedComments), [selectedComments])
	const selectedOrderedComment = orderedComments[commentsViewSelection]?.comment ?? null
	const commentsRowCount = commentsViewRowCount(selectedComments.length)
	const moveCommentsSelection = (delta: number) => {
		setCommentsViewSelection((current) => {
			const max = commentsRowCount - 1
			return Math.max(0, Math.min(max, current + delta))
		})
	}

	const setCommentsSelection = (index: number) => {
		const max = commentsRowCount - 1
		setCommentsViewSelection(Math.max(0, Math.min(max, index)))
	}

	const confirmCommentSelection = () => {
		if (commentsViewSelection >= selectedComments.length) {
			openNewIssueCommentModal()
			return
		}
		openReplyToSelectedComment()
	}

	const openSelectedCommentInBrowser = () => {
		const comment = selectedOrderedComment
		if (!comment?.url) return
		void openUrl(comment.url)
			.then(() => flashNotice(`Opened ${comment.url}`))
			.catch((error) => flashNotice(errorMessage(error)))
	}

	const refreshSelectedComments = () => {
		if (activeWorkspaceSurface === "issues") {
			if (selectedIssue) loadIssueComments(selectedIssue, true)
		} else if (selectedPullRequest) {
			loadPullRequestComments(selectedPullRequest, true)
		}
	}

	const scrollToDiffFile = (index: number) => {
		const stackedFile = stackedDiffFiles[index]
		diffScrollRef.current?.scrollTo({ x: 0, y: stackedFile?.headerLine ?? 0 })
		syncDiffScrollState()
	}

	const syncDiffScrollState = () => {
		const scrollTop = diffScrollRef.current?.scrollTop
		if (scrollTop === undefined || stackedDiffFiles.length === 0) return
		setDiffScrollTop((current) => (current === scrollTop ? current : scrollTop))
		const nextIndex = Math.max(0, stackedDiffFileIndexAtLine(stackedDiffFiles, scrollTop))
		setDiffFileIndex((current) => (current === nextIndex ? current : nextIndex))
	}

	const scrollDetailPreviewBy = (y: number) => {
		detailPreviewScrollRef.current?.scrollBy({ x: 0, y })
	}
	const scrollDetailPreviewTo = (y: number) => {
		detailPreviewScrollRef.current?.scrollTo({ x: 0, y })
	}

	const ensureDiffLineVisible = (line: number) => {
		const scroll = diffScrollRef.current
		if (!scroll) return
		const viewportHeight = Math.max(1, wideBodyHeight - (selectedDiffCommentThread.length > 0 ? 6 : 3))
		const nextTop = scrollTopForVisibleLine(scroll.scrollTop, viewportHeight, line, DIFF_STICKY_HEADER_LINES)
		if (nextTop !== scroll.scrollTop) {
			scroll.scrollTo({ x: 0, y: nextTop })
			syncDiffScrollState()
		}
	}

	useEffect(() => {
		if (!diffFullView) return
		const interval = globalThis.setInterval(syncDiffScrollState, 80)
		return () => globalThis.clearInterval(interval)
	}, [diffFullView, stackedDiffFiles])

	const selectDiffFile = (index: number) => {
		if (readyDiffFiles.length === 0) return
		const nextIndex = safeDiffFileIndex(readyDiffFiles, index)
		setDiffFileIndex(nextIndex)
		setDiffCommentRangeStartIndex(null)
		const targetSide = diffPreferredSide ?? selectedDiffCommentAnchor?.side
		const nextAnchor =
			diffCommentAnchors.find((anchor) => anchor.fileIndex === nextIndex && anchor.side === targetSide) ?? diffCommentAnchors.find((anchor) => anchor.fileIndex === nextIndex)
		if (nextAnchor) setDiffCommentAnchorIndex(diffCommentAnchors.indexOf(nextAnchor))
		scrollToDiffFile(nextIndex)
	}

	const jumpDiffFile = (delta: 1 | -1) => {
		selectDiffFile(diffFileIndex + delta)
	}

	const openChangedFilesModal = () => {
		if (readyDiffFiles.length === 0) return
		setChangedFilesModal({
			query: "",
			selectedIndex: safeDiffFileIndex(readyDiffFiles, diffFileIndex),
		})
	}

	const selectChangedFile = () => {
		const selectedIndex = changedFileResults.length === 0 ? 0 : Math.max(0, Math.min(changedFilesModal.selectedIndex, changedFileResults.length - 1))
		const entry = changedFileResults[selectedIndex]
		if (!entry) return
		closeActiveModal()
		selectDiffFile(entry.index)
	}

	const navigableDiffCommentAnchors = () =>
		diffCommentRangeStartAnchor ? diffCommentAnchors.filter((anchor) => sameDiffCommentTarget(anchor, diffCommentRangeStartAnchor)) : diffCommentAnchors

	const moveDiffCommentAnchor = (delta: number, options: { readonly preserveViewportRow?: boolean } = {}) => {
		const anchors = navigableDiffCommentAnchors()
		if (anchors.length === 0) return
		const currentAnchor = selectedDiffCommentAnchor && anchors.includes(selectedDiffCommentAnchor) ? selectedDiffCommentAnchor : anchors[0]
		const nextAnchor = verticalDiffAnchor(anchors, currentAnchor ?? null, delta, diffPreferredSide)
		if (!nextAnchor) return
		if (options.preserveViewportRow) {
			const scroll = diffScrollRef.current
			if (scroll && currentAnchor) {
				const maxScreenOffset = Math.max(DIFF_STICKY_HEADER_LINES, scroll.viewport.height - 2)
				const screenOffset = Math.max(DIFF_STICKY_HEADER_LINES, Math.min(maxScreenOffset, currentAnchor.renderLine - scroll.scrollTop))
				const maxScrollTop = Math.max(0, scroll.scrollHeight - scroll.viewport.height)
				const nextTop = Math.max(0, Math.min(maxScrollTop, nextAnchor.renderLine - screenOffset))
				suppressNextDiffCommentScrollRef.current = true
				scroll.scrollTo({ x: 0, y: nextTop })
				syncDiffScrollState()
			}
		}
		setDiffCommentAnchorIndex(diffCommentAnchors.indexOf(nextAnchor))
	}

	const moveDiffCommentToBoundary = (boundary: "first" | "last") => {
		const anchors = navigableDiffCommentAnchors()
		const nextAnchor = boundary === "first" ? anchors[0] : anchors[anchors.length - 1]
		if (!nextAnchor) return
		setDiffCommentAnchorIndex(diffCommentAnchors.indexOf(nextAnchor))
		setDiffFileIndex(nextAnchor.fileIndex)
	}

	const alignSelectedDiffCommentAnchor = (position: "top" | "center" | "bottom") => {
		if (!selectedDiffCommentAnchor) return
		const scroll = diffScrollRef.current
		if (!scroll) return
		const viewportHeight = Math.max(1, scroll.viewport.height)
		const offset =
			position === "top"
				? DIFF_STICKY_HEADER_LINES
				: position === "center"
					? Math.max(DIFF_STICKY_HEADER_LINES, Math.floor(viewportHeight / 2))
					: Math.max(DIFF_STICKY_HEADER_LINES, viewportHeight - 2)
		const maxScrollTop = Math.max(0, scroll.scrollHeight - viewportHeight)
		const nextTop = Math.max(0, Math.min(maxScrollTop, selectedDiffCommentAnchor.renderLine - offset))
		scroll.scrollTo({ x: 0, y: nextTop })
		syncDiffScrollState()
	}

	const selectDiffCommentSide = (side: DiffCommentSide) => {
		setDiffPreferredSide(side)
		if (!selectedDiffCommentAnchor) return
		const nextAnchor = diffAnchorOnSide(diffCommentAnchors, selectedDiffCommentAnchor, side)
		if (!nextAnchor) return
		setDiffCommentRangeStartIndex(null)
		setDiffCommentAnchorIndex(diffCommentAnchors.indexOf(nextAnchor))
	}

	const selectDiffCommentLine = (renderLine: number, side: DiffCommentSide | null) => {
		const fileIndex = stackedDiffFileIndexAtLine(stackedDiffFiles, renderLine)
		const stackedFile = stackedDiffFiles[fileIndex]
		if (!stackedFile || renderLine < stackedFile.diffStartLine || renderLine >= stackedFile.diffStartLine + stackedFile.diffHeight) return
		const fileAnchors = diffCommentAnchors.filter((anchor) => anchor.fileIndex === fileIndex)
		const lineAnchors = fileAnchors.filter((anchor) => anchor.renderLine === renderLine)
		const nextAnchor =
			(side ? lineAnchors.find((anchor) => anchor.side === side) : undefined) ?? lineAnchors[0] ?? [...fileAnchors].reverse().find((anchor) => anchor.renderLine <= renderLine)
		if (!nextAnchor) return
		suppressNextDiffCommentScrollRef.current = true
		setDiffPreferredSide(side ?? nextAnchor.side)
		if (diffCommentRangeStartAnchor && !sameDiffCommentTarget(diffCommentRangeStartAnchor, nextAnchor)) {
			setDiffCommentRangeStartIndex(null)
		}
		setDiffCommentAnchorIndex(diffCommentAnchors.indexOf(nextAnchor))
		setDiffFileIndex(nextAnchor.fileIndex)
	}

	const editComment = (transform: (state: CommentEditorValue) => CommentEditorValue) => {
		setCommentModal((current) => {
			const next = transform({ body: current.body, cursor: current.cursor })
			if (next.body === current.body && next.cursor === current.cursor && current.error === null) return current
			return { ...current, body: next.body, cursor: next.cursor, error: null }
		})
	}

	const editSubmitReview = (transform: (state: CommentEditorValue) => CommentEditorValue) => {
		setSubmitReviewModal((current) => {
			const next = transform({ body: current.body, cursor: current.cursor })
			if (next.body === current.body && next.cursor === current.cursor && current.error === null) return current
			return { ...current, body: next.body, cursor: next.cursor, error: null }
		})
	}

	const openSubmitReviewModal = (initialEvent: SubmitPullRequestReviewInput["event"] = "APPROVE") => {
		if (!selectedPullRequest || selectedPullRequest.state !== "open") return
		const selectedIndex = Math.max(
			0,
			submitReviewOptions.findIndex((option) => option.event === initialEvent),
		)
		setSubmitReviewModal({
			repository: selectedPullRequest.repository,
			number: selectedPullRequest.number,
			focus: "action",
			selectedIndex,
			body: "",
			cursor: 0,
			running: false,
			error: null,
		})
	}

	const openDiffCommentModal = () => {
		if (!selectedDiffCommentAnchor || !selectedPullRequest) return
		setCommentModal(initialCommentModalState)
	}

	const openDiffCommentThreadModal = () => {
		if (!selectedDiffCommentAnchor || selectedDiffCommentThread.length === 0) return
		setCommentThreadModal({ scrollOffset: 0 })
	}

	const openSelectedDiffComment = () => {
		if (diffCommentRangeActive) {
			openDiffCommentModal()
			return
		}
		if (selectedDiffCommentThread.length > 0) openDiffCommentThreadModal()
		else openDiffCommentModal()
	}

	const toggleDiffCommentRange = () => {
		if (!selectedDiffCommentAnchor) return
		setDiffCommentRangeStartIndex((current) => (current === null ? selectedDiffCommentAnchorIndex : null))
	}

	const moveDiffCommentThread = (delta: 1 | -1) => {
		if (diffCommentThreadAnchors.length === 0) {
			flashNotice("No diff comments")
			return
		}
		const currentIndex = selectedDiffCommentAnchor
			? diffCommentThreadAnchors.findIndex((anchor) => diffCommentLocationKey(anchor) === diffCommentLocationKey(selectedDiffCommentAnchor))
			: -1
		const nextAnchor =
			currentIndex >= 0
				? diffCommentThreadAnchors[(currentIndex + delta + diffCommentThreadAnchors.length) % diffCommentThreadAnchors.length]
				: delta > 0
					? (diffCommentThreadAnchors.find((anchor) => !selectedDiffCommentAnchor || anchor.renderLine > selectedDiffCommentAnchor.renderLine) ?? diffCommentThreadAnchors[0])
					: ([...diffCommentThreadAnchors].reverse().find((anchor) => !selectedDiffCommentAnchor || anchor.renderLine < selectedDiffCommentAnchor.renderLine) ??
						diffCommentThreadAnchors[diffCommentThreadAnchors.length - 1])
		if (!nextAnchor) return
		setDiffCommentRangeStartIndex(null)
		setDiffCommentAnchorIndex(diffCommentAnchors.indexOf(nextAnchor))
		setDiffFileIndex(nextAnchor.fileIndex)
	}

	const submitDiffComment = () => {
		if (!selectedPullRequest || !selectedDiffCommentAnchor) return
		const body = requireCommentBody()
		if (body === null) return

		const targetRange = selectedDiffCommentRange
		const target = targetRange?.end ?? selectedDiffCommentAnchor
		const key = pullRequestDiffKey(selectedPullRequest)
		const threadKey = selectedDiffKey ? diffCommentThreadMapKey(selectedDiffKey, target) : null
		const optimisticReview = {
			id: `local:${Date.now()}`,
			path: target.path,
			line: target.line,
			side: target.side,
			author: username ?? "you",
			body,
			createdAt: new Date(),
			url: null,
			inReplyTo: null,
		} satisfies PullRequestReviewComment
		const rangeInput = targetRange && targetRange.start.line !== targetRange.end.line ? { startLine: targetRange.start.line, startSide: targetRange.start.side } : {}
		const input = {
			repository: selectedPullRequest.repository,
			number: selectedPullRequest.number,
			commitId: selectedPullRequest.headRefOid,
			path: target.path,
			line: target.line,
			side: target.side,
			body,
			...rangeInput,
		} satisfies CreatePullRequestCommentInput

		submitOptimisticComment({
			key,
			optimistic: reviewCommentAsPullRequestComment(optimisticReview),
			postingMessage: `Commenting on ${target.path}:${target.line}`,
			successMessage: `Commented on ${target.path}:${target.line}`,
			request: () => createPullRequestComment(input).then(reviewCommentAsPullRequestComment),
			onOptimistic: () => {
				if (threadKey) {
					setDiffCommentThreads((current) => ({
						...current,
						[threadKey]: [...(current[threadKey] ?? []), optimisticReview],
					}))
				}
				setDiffCommentRangeStartIndex(null)
			},
			onCreated: (_optimistic, created) => {
				if (!threadKey || created._tag !== "review-comment") return
				setDiffCommentThreads((current) => ({
					...current,
					[threadKey]: (current[threadKey] ?? []).map((existing) => (existing.id === optimisticReview.id ? created : existing)),
				}))
			},
			onRevert: () => {
				if (!threadKey) return
				setDiffCommentThreads((current) => {
					const next = { ...current }
					const comments = (next[threadKey] ?? []).filter((comment) => comment.id !== optimisticReview.id)
					if (comments.length > 0) next[threadKey] = comments
					else delete next[threadKey]
					return next
				})
			},
		})
	}

	const openNewIssueCommentModal = () => {
		if (!selectedCommentSubject) return
		setCommentModal({ ...initialCommentModalState, target: { kind: "issue" } })
	}

	const openReplyToSelectedComment = () => {
		if (!selectedCommentSubject) return
		const comment = selectedOrderedComment
		if (!comment) {
			flashNotice("No comment selected")
			return
		}
		if (comment._tag !== "review-comment") {
			// Issue comments don't thread on GitHub; pre-fill a quote so the reply
			// reads as a response in the chronological list.
			const quote = quotedReplyBody(comment.author, comment.body)
			setCommentModal({ ...initialCommentModalState, body: quote, cursor: quote.length, target: { kind: "issue" } })
			return
		}
		// GitHub /comments/{id}/replies wants the *thread root* id; replying via a
		// reply id can return "parent comment not found".
		const rootId = findReviewThreadRootId(selectedComments, comment.id)
		const anchor = `${comment.path}:${comment.line}`
		setCommentModal({ ...initialCommentModalState, target: { kind: "reply", inReplyTo: rootId, anchorLabel: anchor } })
	}

	// Optimistic insert + post + swap-or-revert. Shared by issue and reply.
	const submitOptimisticComment = (input: {
		readonly key: string
		readonly optimistic: PullRequestComment
		readonly postingMessage: string
		readonly successMessage: string
		readonly request: () => Promise<PullRequestComment>
		readonly onOptimistic?: (comment: PullRequestComment) => void
		readonly onCreated?: (optimistic: PullRequestComment, created: PullRequestComment) => void
		readonly onRevert?: (comment: PullRequestComment) => void
	}) => {
		const { key, optimistic, postingMessage, successMessage, request, onOptimistic, onCreated, onRevert } = input
		setPullRequestComments((current) => ({ ...current, [key]: [...(current[key] ?? []), optimistic] }))
		onOptimistic?.(optimistic)
		closeActiveModal()
		flashNotice(postingMessage)
		void request()
			.then((created) => {
				setPullRequestComments((current) => ({ ...current, [key]: (current[key] ?? []).map((entry) => (entry.id === optimistic.id ? created : entry)) }))
				onCreated?.(optimistic, created)
				flashNotice(successMessage)
			})
			.catch((error) => {
				setPullRequestComments((current) => ({ ...current, [key]: (current[key] ?? []).filter((entry) => entry.id !== optimistic.id) }))
				onRevert?.(optimistic)
				flashNotice(errorMessage(error))
			})
	}

	const requireCommentBody = (): string | null => {
		const body = commentModal.body.trim()
		if (body.length === 0) {
			setCommentModal((current) => ({ ...current, error: "Write a comment before saving." }))
			return null
		}
		return body
	}

	const submitIssueComment = () => {
		if (!selectedCommentSubject || !selectedCommentKey) return
		const body = requireCommentBody()
		if (body === null) return
		const { repository, number } = selectedCommentSubject
		const selectedIssueUrl = activeWorkspaceSurface === "issues" ? selectedIssue?.url : null
		submitOptimisticComment({
			key: selectedCommentKey,
			optimistic: { _tag: "comment", id: `local:issue:${Date.now()}`, author: username ?? "you", body, createdAt: new Date(), url: null },
			postingMessage: `Posting comment on #${number}`,
			successMessage: `Commented on #${number}`,
			request: () => createPullRequestIssueComment({ repository, number, body }),
			onOptimistic: () => {
				if (selectedIssueUrl) updateIssue(selectedIssueUrl, (issue) => ({ ...issue, commentCount: issue.commentCount + 1 }))
			},
			onRevert: () => {
				if (selectedIssueUrl) updateIssue(selectedIssueUrl, (issue) => ({ ...issue, commentCount: Math.max(0, issue.commentCount - 1) }))
			},
		})
	}

	const submitReplyComment = () => {
		if (!selectedPullRequest || commentModal.target.kind !== "reply") return
		const body = requireCommentBody()
		if (body === null) return
		const { repository, number } = selectedPullRequest
		const target = commentModal.target
		const parent = selectedComments.find((entry) => entry._tag === "review-comment" && entry.id === target.inReplyTo)
		const reviewParent = parent?._tag === "review-comment" ? parent : null
		const key = pullRequestDiffKey(selectedPullRequest)
		const threadKey = reviewParent ? diffCommentThreadMapKey(key, reviewParent) : null
		submitOptimisticComment({
			key,
			optimistic: {
				_tag: "review-comment",
				id: `local:reply:${Date.now()}`,
				path: reviewParent?.path ?? "",
				line: reviewParent?.line ?? 0,
				side: reviewParent?.side ?? "RIGHT",
				author: username ?? "you",
				body,
				createdAt: new Date(),
				url: null,
				inReplyTo: target.inReplyTo,
			},
			postingMessage: `Replying on ${target.anchorLabel}`,
			successMessage: `Replied on ${target.anchorLabel}`,
			request: () => replyToReviewComment({ repository, number, inReplyTo: target.inReplyTo, body }),
			onOptimistic: (comment) => {
				if (!threadKey || comment._tag !== "review-comment") return
				setDiffCommentThreads((current) => ({ ...current, [threadKey]: [...(current[threadKey] ?? []), comment] }))
			},
			onCreated: (optimistic, created) => {
				if (!threadKey || created._tag !== "review-comment") return
				setDiffCommentThreads((current) => ({
					...current,
					[threadKey]: (current[threadKey] ?? []).map((comment) => (comment.id === optimistic.id ? created : comment)),
				}))
			},
			onRevert: (comment) => {
				if (!threadKey) return
				setDiffCommentThreads((current) => {
					const next = { ...current }
					const comments = (next[threadKey] ?? []).filter((entry) => entry.id !== comment.id)
					if (comments.length > 0) next[threadKey] = comments
					else delete next[threadKey]
					return next
				})
			},
		})
	}

	// Selected comment must belong to the viewer and have a server id (not the
	// optimistic `local:` prefix) before we offer edit/delete affordances.
	const canEditComment = (comment: PullRequestComment | null): comment is PullRequestComment =>
		comment !== null && username !== null && comment.author === username && !comment.id.startsWith("local:")

	const openEditSelectedComment = () => {
		if (!selectedCommentSubject) return
		const comment = selectedOrderedComment
		if (!canEditComment(comment)) {
			flashNotice(comment ? "Can't edit this comment" : "No comment selected")
			return
		}
		const anchorLabel = comment._tag === "review-comment" ? `Editing ${comment.path}:${comment.line}` : `Editing comment on #${selectedCommentSubject.number}`
		setCommentModal({
			body: comment.body,
			cursor: comment.body.length,
			error: null,
			target: { kind: "edit", commentId: comment.id, commentTag: comment._tag, anchorLabel },
		})
	}

	const submitEditComment = () => {
		if (!selectedCommentSubject || !selectedCommentKey || commentModal.target.kind !== "edit") return
		const body = requireCommentBody()
		if (body === null) return
		const target = commentModal.target
		const key = selectedCommentKey
		const previous = (pullRequestComments[key] ?? []).find((entry) => entry.id === target.commentId)
		if (!previous) {
			setCommentModal((current) => ({ ...current, error: "Comment not found in cache." }))
			return
		}
		const repository = selectedCommentSubject.repository

		// Optimistically swap the body in both caches; restore the previous on failure.
		const previousReview = previous._tag === "review-comment" ? previous : null
		const threadKey = previousReview ? diffCommentThreadMapKey(key, previousReview) : null
		const replaceInList = <T extends { readonly id: string }>(list: readonly T[], next: T) => list.map((entry) => (entry.id === target.commentId ? next : entry))

		setPullRequestComments((current) => ({ ...current, [key]: replaceInList(current[key] ?? [], { ...previous, body }) }))
		if (threadKey && previousReview) {
			setDiffCommentThreads((current) => ({
				...current,
				[threadKey]: replaceInList(current[threadKey] ?? [], { ...previousReview, body }),
			}))
		}
		closeActiveModal()
		flashNotice("Saving comment edit")

		const request =
			target.commentTag === "comment"
				? () => editPullRequestIssueComment({ repository, commentId: target.commentId, body })
				: () => editReviewComment({ repository, commentId: target.commentId, body })

		void request()
			.then((updated) => {
				setPullRequestComments((current) => ({ ...current, [key]: replaceInList(current[key] ?? [], updated) }))
				if (threadKey && updated._tag === "review-comment") {
					setDiffCommentThreads((current) => ({
						...current,
						[threadKey]: replaceInList(current[threadKey] ?? [], updated),
					}))
				}
				flashNotice("Comment updated")
			})
			.catch((error) => {
				setPullRequestComments((current) => ({ ...current, [key]: replaceInList(current[key] ?? [], previous) }))
				if (threadKey && previousReview) {
					setDiffCommentThreads((current) => ({
						...current,
						[threadKey]: replaceInList(current[threadKey] ?? [], previousReview),
					}))
				}
				flashNotice(errorMessage(error))
			})
	}

	const submitCommentModal = () => {
		switch (commentModal.target.kind) {
			case "diff":
				submitDiffComment()
				return
			case "issue":
				submitIssueComment()
				return
			case "reply":
				submitReplyComment()
				return
			case "edit":
				submitEditComment()
				return
		}
	}

	const openDeleteSelectedComment = () => {
		if (!selectedCommentSubject) return
		const comment = selectedOrderedComment
		if (!canEditComment(comment)) {
			flashNotice(comment ? "Can't delete this comment" : "No comment selected")
			return
		}
		const firstLine = comment.body.split("\n").find((line) => line.trim().length > 0) ?? ""
		const preview = firstLine.length > 80 ? `${firstLine.slice(0, 79)}…` : firstLine
		setDeleteCommentModal({
			commentId: comment.id,
			commentTag: comment._tag,
			author: comment.author,
			preview,
			running: false,
			error: null,
		})
	}

	const confirmDeleteComment = () => {
		if (!selectedCommentSubject || !selectedCommentKey || deleteCommentModal.running) return
		const target = { commentId: deleteCommentModal.commentId, commentTag: deleteCommentModal.commentTag }
		const key = selectedCommentKey
		const list = pullRequestComments[key] ?? []
		const previousIndex = list.findIndex((entry) => entry.id === target.commentId)
		const previous = previousIndex >= 0 ? list[previousIndex] : undefined
		if (!previous) {
			setDeleteCommentModal((current) => ({ ...current, error: "Comment not found in cache." }))
			return
		}
		const previousReview = previous._tag === "review-comment" ? previous : null
		const threadKey = previousReview ? diffCommentThreadMapKey(key, previousReview) : null
		const previousThread = threadKey ? (diffCommentThreads[threadKey] ?? []) : []
		const previousThreadIndex = previousReview ? previousThread.findIndex((entry) => entry.id === previous.id) : -1
		const repository = selectedCommentSubject.repository
		const selectedIssueUrl = activeWorkspaceSurface === "issues" ? selectedIssue?.url : null

		setPullRequestComments((current) => ({
			...current,
			[key]: (current[key] ?? []).filter((entry) => entry.id !== target.commentId),
		}))
		if (threadKey) {
			setDiffCommentThreads((current) => {
				const next = { ...current }
				const filtered = (next[threadKey] ?? []).filter((entry) => entry.id !== target.commentId)
				if (filtered.length > 0) next[threadKey] = filtered
				else delete next[threadKey]
				return next
			})
		}
		closeActiveModal()
		flashNotice("Deleting comment")

		const request =
			target.commentTag === "comment"
				? () => deletePullRequestIssueComment({ repository, commentId: target.commentId })
				: () => deleteReviewComment({ repository, commentId: target.commentId })

		if (selectedIssueUrl && target.commentTag === "comment") updateIssue(selectedIssueUrl, (issue) => ({ ...issue, commentCount: Math.max(0, issue.commentCount - 1) }))

		void request()
			.then(() => flashNotice("Comment deleted"))
			.catch((error) => {
				// Splice the previous entry back at its original index in both caches.
				setPullRequestComments((current) => {
					const arr = current[key] ?? []
					if (arr.some((entry) => entry.id === previous.id)) return current
					const restored = [...arr]
					restored.splice(Math.min(previousIndex, restored.length), 0, previous)
					return { ...current, [key]: restored }
				})
				if (threadKey && previousReview) {
					setDiffCommentThreads((current) => {
						const arr = current[threadKey] ?? []
						if (arr.some((entry) => entry.id === previousReview.id)) return current
						const restored = [...arr]
						const insertIndex = previousThreadIndex >= 0 ? previousThreadIndex : restored.length
						restored.splice(Math.min(insertIndex, restored.length), 0, previousReview)
						return { ...current, [threadKey]: restored }
					})
				}
				if (selectedIssueUrl && target.commentTag === "comment") updateIssue(selectedIssueUrl, (issue) => ({ ...issue, commentCount: issue.commentCount + 1 }))
				flashNotice(errorMessage(error))
			})
	}

	const confirmSubmitReview = () => {
		if (!submitReviewModal.repository || submitReviewModal.number === null || submitReviewModal.running) return
		const option = submitReviewOptions[submitReviewModal.selectedIndex]
		if (!option) return
		const repository = submitReviewModal.repository
		const number = submitReviewModal.number
		const body = submitReviewModal.body.trim()
		const targetPullRequest = pullRequests.find((pullRequest) => pullRequest.repository === repository && pullRequest.number === number) ?? null
		const nextReviewStatus = reviewStatusAfterSubmit[option.event]

		setSubmitReviewModal((current) => ({ ...current, running: true, error: null }))
		void submitPullRequestReview({ repository, number, event: option.event, body })
			.then(() => {
				if (targetPullRequest && nextReviewStatus) {
					updatePullRequest(targetPullRequest.url, (pullRequest) => ({ ...pullRequest, reviewStatus: nextReviewStatus }))
				}
				closeActiveModal()
				flashNotice(`Submitted ${option.title.toLowerCase()} review for #${number}`)
			})
			.catch((error) => {
				setSubmitReviewModal((current) => ({ ...current, running: false, error: errorMessage(error) }))
				flashNotice(errorMessage(error))
			})
	}

	const openSelectedPullRequestInBrowser = (pullRequest: PullRequestItem) => {
		void openInBrowser(pullRequest)
			.then(() => flashNotice(`Opened #${pullRequest.number} in browser`))
			.catch((error) => flashNotice(errorMessage(error)))
	}

	const openLinkInBrowser = (url: string) => {
		void openUrl(url)
			.then(() => flashNotice(`Opened ${url}`))
			.catch((error) => flashNotice(errorMessage(error)))
	}

	const copySelectedPullRequestMetadata = () => {
		if (!selectedPullRequest) return
		void copyToClipboard(pullRequestMetadataText(selectedPullRequest))
			.then(() => flashNotice(`Copied #${selectedPullRequest.number} metadata`))
			.catch((error) => flashNotice(errorMessage(error)))
	}

	const openPullRequestStateModal = () => {
		if (!selectedPullRequest || selectedPullRequest.state !== "open") return
		setPullRequestStateModal({
			repository: selectedPullRequest.repository,
			number: selectedPullRequest.number,
			title: selectedPullRequest.title,
			url: selectedPullRequest.url,
			isDraft: selectedPullRequest.reviewStatus === "draft",
			selectedIsDraft: selectedPullRequest.reviewStatus !== "draft",
			running: false,
			error: null,
		})
	}

	const movePullRequestStateSelection = () => {
		setPullRequestStateModal((current) => ({ ...current, selectedIsDraft: !current.selectedIsDraft }))
	}

	const confirmPullRequestStateChange = () => {
		if (!pullRequestStateModal.repository || pullRequestStateModal.number === null || !pullRequestStateModal.url || pullRequestStateModal.running) return
		const { repository, number, url, isDraft, selectedIsDraft } = pullRequestStateModal
		if (selectedIsDraft === isDraft) {
			closeActiveModal()
			return
		}
		const previousPullRequest = pullRequests.find((pullRequest) => pullRequest.url === url) ?? null
		const nextReviewStatus = selectedIsDraft ? "draft" : "review"

		if (previousPullRequest) {
			updatePullRequest(url, (pullRequest) => ({
				...pullRequest,
				reviewStatus: nextReviewStatus,
			}))
		}
		closeActiveModal()
		flashNotice(selectedIsDraft ? `Converted #${number} to draft` : `Marked #${number} ready for review`)
		void toggleDraftStatus({ repository, number, isDraft }).catch((error) => {
			if (previousPullRequest) updatePullRequest(url, () => previousPullRequest)
			const message = errorMessage(error)
			flashNotice(message)
		})
	}

	const openCloseModal = () => {
		if (!selectedPullRequest || selectedPullRequest.state !== "open") return
		setCloseModal({
			repository: selectedPullRequest.repository,
			number: selectedPullRequest.number,
			title: selectedPullRequest.title,
			url: selectedPullRequest.url,
			running: false,
			error: null,
		})
	}

	const confirmClosePullRequest = () => {
		if (!closeModal.repository || closeModal.number === null || !closeModal.url || closeModal.running) return
		const { repository, number, url } = closeModal
		const targetPullRequest = pullRequests.find((pullRequest) => pullRequest.url === url)
		const previousPullRequest = targetPullRequest ?? null

		setCloseModal((current) => ({ ...current, running: true, error: null }))
		void closePullRequest({ repository, number })
			.then(() => {
				if (previousPullRequest) markPullRequestCompleted(previousPullRequest, "closed")
				closeActiveModal()
				refreshPullRequests(`Closed #${number}`)
			})
			.catch((error) => {
				setCloseModal((current) => ({ ...current, running: false, error: errorMessage(error) }))
				flashNotice(errorMessage(error))
			})
	}

	const { openThemeModal, closeThemeModal, moveThemeSelection, updateThemeQuery, toggleThemeTone, toggleThemeMode, editThemeQuery } = themeModalActions

	const toggleDiffRenderView = () => {
		preserveCurrentDiffLocation()
		setDiffRenderView((current) => (current === "unified" ? "split" : "unified"))
	}

	const toggleDiffWrapMode = () => {
		preserveCurrentDiffLocation()
		setDiffWrapMode((current) => (current === "none" ? "word" : "none"))
	}

	const toggleDiffWhitespaceMode = () => {
		const next = diffWhitespaceMode === "ignore" ? "show" : "ignore"
		preserveCurrentDiffLocation()
		setDiffWhitespaceMode(next)
		void Effect.runPromise(saveStoredDiffWhitespaceMode(next)).catch((error) => flashNotice(errorMessage(error)))
	}

	const openLabelModal = () => {
		if (!selectedCommentSubject) return
		const repository = selectedCommentSubject.repository
		const cachedLabels = registry.get(labelCacheAtom)[repository]
		if (cachedLabels) {
			setLabelModal({
				repository,
				query: "",
				selectedIndex: 0,
				availableLabels: cachedLabels,
				loading: false,
			})
			return
		}

		setLabelModal({ repository, query: "", selectedIndex: 0, availableLabels: [], loading: true })
		void loadRepoLabels(repository)
			.then((labels) => {
				setLabelCache((current) => ({ ...current, [repository]: labels }))
				setLabelModal((current) => (current.repository === repository ? { ...current, availableLabels: labels, loading: false } : current))
			})
			.catch((error) => {
				setLabelModal((current) => (current.repository === repository ? { ...current, loading: false } : current))
				flashNotice(errorMessage(error))
			})
	}

	const { openMergeModal, cancelOrCloseMergeModal, confirmMergeAction, cycleMergeMethod, moveMergeSelection } = useMergeFlow({
		mergeModal,
		setMergeModal,
		selectedPullRequest,
		pullRequests,
		closeActiveModal,
		flashNotice,
		updatePullRequest,
		markPullRequestCompleted,
		restoreOptimisticPullRequest,
		refreshPullRequests,
	})

	const toggleLabelAtIndex = () => {
		if (!selectedCommentSubject) return
		const filtered = filterLabels(labelModal.availableLabels, labelModal.query)
		const label = filtered[labelModal.selectedIndex]
		if (!label) return

		const isIssue = activeWorkspaceSurface === "issues"
		const isActive = selectedItemLabels.some((l) => l.name.toLowerCase() === label.name.toLowerCase())
		const previousPullRequest = isIssue ? null : selectedPullRequest
		const previousIssue = isIssue ? selectedIssue : null
		const updateSelectedLabels = (labels: readonly PullRequestLabel[]) => {
			if (isIssue && selectedIssue) {
				updateIssue(selectedIssue.url, (issue) => ({ ...issue, labels }))
			} else if (selectedPullRequest) {
				updatePullRequest(selectedPullRequest.url, (pr) => ({ ...pr, labels }))
			}
		}
		const restorePreviousLabels = () => {
			if (previousIssue) updateIssue(previousIssue.url, () => previousIssue)
			if (previousPullRequest) updatePullRequest(previousPullRequest.url, () => previousPullRequest)
		}
		const { repository, number } = selectedCommentSubject

		if (isActive) {
			updateSelectedLabels(selectedItemLabels.filter((l) => l.name.toLowerCase() !== label.name.toLowerCase()))
			const removeLabel = isIssue ? removeIssueLabel : removePullRequestLabel
			void removeLabel({ repository, number, label: label.name })
				.then(() => flashNotice(`Removed ${label.name} from #${number}`))
				.catch((error) => {
					restorePreviousLabels()
					flashNotice(errorMessage(error))
				})
		} else {
			updateSelectedLabels([...selectedItemLabels, { name: label.name, color: label.color }])
			const addLabel = isIssue ? addIssueLabel : addPullRequestLabel
			void addLabel({ repository, number, label: label.name })
				.then(() => flashNotice(`Added ${label.name} to #${number}`))
				.catch((error) => {
					restorePreviousLabels()
					flashNotice(errorMessage(error))
				})
		}
	}

	const openCommandPalette = () => {
		setCommandPalette(initialCommandPaletteState)
	}
	const openRepositoryPicker = () => {
		setOpenRepositoryModal({ query: selectedRepository ?? "", error: null })
	}
	const openRepositoryFromInput = () => {
		const repository = parseRepositoryInput(openRepositoryModal.query)
		if (!repository) {
			setOpenRepositoryModal((current) => ({ ...current, error: "Enter a repository as owner/name or a GitHub URL." }))
			return
		}
		closeActiveModal()
		switchViewTo({ _tag: "Repository", repository })
		flashNotice(`Opened ${repository}`)
	}
	const insertPastedText = (text: string) => {
		if (text.length === 0) return false
		if (commandPaletteActive) {
			setCommandPalette((current) => ({ ...current, query: current.query + singleLineText(text), selectedIndex: 0 }))
			return true
		}
		if (openRepositoryModalActive) {
			setOpenRepositoryModal((current) => ({ ...current, query: current.query + singleLineText(text), error: null }))
			return true
		}
		if (themeModalActive && themeModal.filterMode) {
			editThemeQuery((query) => query + singleLineText(text))
			return true
		}
		if (commentModalActive) {
			editComment((state) => insertText(state, text.replace(/\r\n?/g, "\n")))
			return true
		}
		if (submitReviewModalActive) {
			setSubmitReviewModal((current) => {
				const next = insertText({ body: current.body, cursor: current.cursor }, text.replace(/\r\n?/g, "\n"))
				return { ...current, focus: "body", body: next.body, cursor: next.cursor, error: null }
			})
			return true
		}
		if (labelModalActive) {
			setLabelModal((current) => ({ ...current, query: current.query + singleLineText(text), selectedIndex: 0 }))
			return true
		}
		if (changedFilesModalActive) {
			setChangedFilesModal((current) => ({ ...current, query: current.query + singleLineText(text), selectedIndex: 0 }))
			return true
		}
		if (filterMode) {
			setFilterDraft((current) => current + singleLineText(text))
			return true
		}
		return false
	}

	usePasteHandler({ renderer, onPaste: insertPastedText })

	const appCommands: readonly AppCommand[] = buildAppCommands({
		pullRequestStatus,
		filterQuery,
		filterMode,
		selectedRepository,
		activeWorkspaceSurface,
		activeViews,
		activeView,
		loadedPullRequestCount,
		hasMorePullRequests,
		isLoadingMorePullRequests,
		selectedPullRequest,
		selectedIssue,
		detailFullView,
		diffFullView,
		commentsViewActive,
		hasSelectedComment: selectedCommentsStatus === "ready" && selectedOrderedComment !== null,
		canEditSelectedComment: canEditComment(selectedOrderedComment),
		diffReady: selectedDiffState?._tag === "Ready",
		effectiveDiffRenderView,
		diffWrapMode,
		diffWhitespaceMode,
		readyDiffFileCount: readyDiffFiles.length,
		diffFileIndex,
		diffRangeActive: diffCommentRangeActive,
		selectedDiffCommentAnchorLabel: selectedDiffCommentLabel,
		selectedDiffCommentThreadCount: selectedDiffCommentThread.length,
		hasDiffCommentThreads: diffCommentThreadAnchors.length > 0,
		actions: {
			openCommandPalette,
			refreshPullRequests,
			openFilter: () => {
				setFilterDraft(filterQuery)
				setFilterMode(true)
			},
			clearFilter: () => {
				setFilterQuery("")
				setFilterDraft("")
				setFilterMode(false)
			},
			openThemeModal,
			openRepositoryPicker,
			switchWorkspaceSurface,
			loadMorePullRequests,
			switchViewTo,
			openDetails: () => {
				setDetailFullView(true)
				setDetailScrollOffset(0)
			},
			closeDetails: () => {
				setDetailFullView(false)
				setDetailScrollOffset(0)
			},
			openDiffView,
			closeDiffView: () => {
				setDiffFullView(false)
				setDiffCommentRangeStartIndex(null)
			},
			openCommentsView,
			closeCommentsView,
			openNewIssueCommentModal,
			openReplyToSelectedComment,
			openEditSelectedComment,
			openDeleteSelectedComment,
			reloadDiff: () => {
				if (!selectedPullRequest) return
				loadPullRequestDiff(selectedPullRequest, { force: true, includeComments: true })
				flashNotice(`Refreshing diff for #${selectedPullRequest.number}`)
			},
			toggleDiffRenderView,
			toggleDiffWrapMode,
			toggleDiffWhitespaceMode,
			openChangedFilesModal,
			jumpDiffFile,
			openSelectedDiffComment,
			toggleDiffCommentRange,
			moveDiffCommentThread,
			openDiffCommentModal,
			openSubmitReviewModal,
			openPullRequestStateModal,
			openLabelModal,
			openMergeModal,
			openCloseModal,
			openPullRequestInBrowser: () => {
				if (selectedPullRequest) openSelectedPullRequestInBrowser(selectedPullRequest)
			},
			copyPullRequestMetadata: copySelectedPullRequestMetadata,
			quit: () => renderer.destroy(),
		},
	})
	const runCommand = (command: AppCommand, options: { readonly notifyDisabled?: boolean; readonly closePalette?: boolean } = {}) => {
		if (!commandEnabled(command)) {
			if (options.notifyDisabled && command.disabledReason) flashNotice(command.disabledReason)
			return false
		}
		if (options.closePalette) closeActiveModal()
		command.run()
		return true
	}
	const runCommandById = (id: string, options: { readonly notifyDisabled?: boolean } = {}) => {
		const command = appCommands.find((entry) => entry.id === id)
		return command ? runCommand(command, options) : false
	}
	const runCommandByIdRef = useRef(runCommandById)
	runCommandByIdRef.current = runCommandById
	const dynamicPaletteCommands: readonly AppCommand[] = (() => {
		if (!commandPaletteActive) return []
		const repository = parseRepositoryInput(commandPalette.query)
		if (!repository || repository === selectedRepository) return []
		return [
			defineCommand({
				id: `view.repository.dynamic:${repository}`,
				title: `Open ${repository}`,
				scope: "View",
				subtitle: "Switch to this repository",
				run: () => switchViewTo({ _tag: "Repository", repository }),
			}),
		]
	})()
	// Dynamic commands always pin to the top of the palette; they came directly from the
	// user's typed input so they shouldn't be filtered by fuzzy score against themselves.
	const staticPaletteCommands = commandPaletteActive
		? filterCommands(
				appCommands.filter((command) => command.id !== "command.open" && commandEnabled(command)),
				commandPalette.query,
			)
		: []
	const activePaletteScope: CommandScope | null = commentsViewActive ? "Comments" : diffFullView ? "Diff" : detailFullView ? "View" : null
	const commandPaletteCommands = commandPaletteActive
		? [...dynamicPaletteCommands, ...(commandPalette.query.trim().length > 0 ? staticPaletteCommands : sortCommandsByActiveScope(staticPaletteCommands, activePaletteScope))]
		: []
	const selectedCommandIndex = clampCommandIndex(commandPalette.selectedIndex, commandPaletteCommands)
	const selectedCommand = commandPaletteCommands[selectedCommandIndex] ?? null

	// === Helpers used by the keymap layers ===
	const scrollCommentThread = (delta: number) =>
		setCommentThreadModal((current) => ({
			...current,
			scrollOffset: Math.max(0, current.scrollOffset + delta),
		}))
	const moveLabelSelection = (delta: -1 | 1) =>
		setLabelModal((current) => {
			const filtered = filterLabels(labelModal.availableLabels, labelModal.query)
			const selectedIndex = wrapIndex(current.selectedIndex + delta, filtered.length)
			return selectedIndex === current.selectedIndex ? current : { ...current, selectedIndex }
		})
	const moveChangedFileSelection = (delta: -1 | 1) =>
		setChangedFilesModal((current) => {
			const selectedIndex = wrapIndex(current.selectedIndex + delta, changedFileResults.length)
			return selectedIndex === current.selectedIndex ? current : { ...current, selectedIndex }
		})
	const moveSubmitReviewActionSelection = (delta: -1 | 1) =>
		setSubmitReviewModal((current) => {
			const selectedIndex = wrapIndex(current.selectedIndex + delta, submitReviewOptions.length)
			return { ...current, selectedIndex, error: null }
		})
	const moveCommandPaletteSelection = (delta: -1 | 1) =>
		setCommandPalette((current) => {
			const selectedIndex = wrapIndex(current.selectedIndex + delta, commandPaletteCommands.length)
			return selectedIndex === current.selectedIndex ? current : { ...current, selectedIndex }
		})
	const selectCommandPaletteIndex = (index: number) =>
		setCommandPalette((current) => {
			const selectedIndex = clampCommandIndex(index, commandPaletteCommands)
			return selectedIndex === current.selectedIndex ? current : { ...current, selectedIndex }
		})
	const runCommandPaletteCommand = (command: AppCommand) => {
		runCommand(command, { notifyDisabled: true, closePalette: true })
	}
	const scrollDetailFullViewBy = (delta: number) => {
		detailScrollRef.current?.scrollBy({ x: 0, y: delta })
		setDetailScrollOffset((current) => Math.max(0, current + delta))
	}
	const scrollDetailFullViewTo = (y: number) => {
		detailScrollRef.current?.scrollTo({ x: 0, y })
		setDetailScrollOffset(y)
	}
	const moveSelectedToPreviousGroup = () =>
		setSelectedIndex((current) => {
			if (activeWorkspaceSurface !== "pullRequests") return current
			if (visiblePullRequests.length === 0 || groupStarts.length === 0) return 0
			const currentGroup = getCurrentGroupIndex(current)
			if (currentGroup <= 0) return groupStarts[groupStarts.length - 1]!
			return groupStarts[currentGroup - 1]!
		})
	const moveSelectedToNextGroup = () =>
		setSelectedIndex((current) => {
			if (activeWorkspaceSurface !== "pullRequests") return current
			if (visiblePullRequests.length === 0 || groupStarts.length === 0) return 0
			const currentGroup = getCurrentGroupIndex(current)
			if (currentGroup >= groupStarts.length - 1) return groupStarts[0]!
			return groupStarts[currentGroup + 1]!
		})
	const stepSelected = (delta: number) =>
		activeWorkspaceSurface === "repos"
			? setSelectedRepositoryIndex((current) => {
					if (repositoryItems.length === 0) return 0
					return Math.max(0, Math.min(repositoryItems.length - 1, current + delta))
				})
			: activeWorkspaceSurface === "issues"
				? setSelectedIssueIndex((current) => {
						if (issues.length === 0) return 0
						return Math.max(0, Math.min(issues.length - 1, current + delta))
					})
				: setSelectedIndex((current) => {
						if (visiblePullRequests.length === 0) return 0
						return Math.max(0, Math.min(visiblePullRequests.length - 1, current + delta))
					})
	const stepSelectedDown = (count = 1) => {
		if (activeWorkspaceSurface === "repos" || activeWorkspaceSurface === "issues") {
			stepSelected(count)
			return
		}
		if (visiblePullRequests.length === 0) return
		if (selectedIndex + count >= visiblePullRequests.length && hasMorePullRequests) {
			loadMorePullRequests()
		}
		stepSelected(count)
	}
	const stepSelectedUp = (count = 1) => stepSelected(-count)
	const stepSelectedDownWithLoadMore = () => {
		if (activeWorkspaceSurface === "repos") {
			setSelectedRepositoryIndex((current) => {
				if (repositoryItems.length === 0) return 0
				return current >= repositoryItems.length - 1 ? 0 : current + 1
			})
			return
		}
		if (activeWorkspaceSurface === "issues") {
			setSelectedIssueIndex((current) => {
				if (issues.length === 0) return 0
				return current >= issues.length - 1 ? 0 : current + 1
			})
			return
		}
		if (visiblePullRequests.length > 0 && selectedIndex >= visiblePullRequests.length - 1 && hasMorePullRequests) {
			loadMorePullRequests()
			return
		}
		setSelectedIndex((current) => {
			if (visiblePullRequests.length === 0) return 0
			return current >= visiblePullRequests.length - 1 ? 0 : current + 1
		})
	}
	const stepSelectedUpWrap = () =>
		activeWorkspaceSurface === "repos"
			? setSelectedRepositoryIndex((current) => {
					if (repositoryItems.length === 0) return 0
					return current <= 0 ? repositoryItems.length - 1 : current - 1
				})
			: activeWorkspaceSurface === "issues"
				? setSelectedIssueIndex((current) => {
						if (issues.length === 0) return 0
						return current <= 0 ? issues.length - 1 : current - 1
					})
				: setSelectedIndex((current) => {
						if (visiblePullRequests.length === 0) return 0
						return current <= 0 ? visiblePullRequests.length - 1 : current - 1
					})
	const handleQuitOrClose = () => {
		if (themeModalActive) {
			closeThemeModal(false)
			return
		}
		if (activeModal._tag !== "None") {
			closeActiveModal()
			return
		}
		runCommandById("app.quit")
	}

	// === Build the keymap context ===
	const appCtx: AppCtx = buildAppCtx({
		flags: {
			closeModalActive,
			pullRequestStateModalActive,
			mergeModalActive,
			commentThreadModalActive,
			changedFilesModalActive,
			submitReviewModalActive,
			labelModalActive,
			themeModalActive,
			openRepositoryModalActive,
			commentModalActive,
			deleteCommentModalActive,
			commandPaletteActive,
			filterMode,
			diffFullView,
			detailFullView,
			commentsViewActive,
			textInputActive:
				commentModalActive ||
				commandPaletteActive ||
				openRepositoryModalActive ||
				changedFilesModalActive ||
				submitReviewModalActive ||
				labelModalActive ||
				filterMode ||
				(themeModalActive && themeModal.filterMode),
		},
		closeModal: { closeActiveModal, confirmClosePullRequest },
		pullRequestStateModal: { closeActiveModal, confirmPullRequestStateChange, movePullRequestStateSelection },
		mergeModal: { mergeModal, cancelOrCloseMergeModal, confirmMergeAction, cycleMergeMethod, moveMergeSelection },
		commentThreadModal: { halfPage, closeActiveModal, openDiffCommentModal, scrollCommentThread },
		changedFilesModal: { hasResults: changedFileResults.length > 0, closeActiveModal, selectChangedFile, moveChangedFileSelection },
		submitReviewModal: { submitReviewModal, closeActiveModal, setSubmitReviewModal, confirmSubmitReview, editSubmitReview, moveSubmitReviewActionSelection },
		labelModal: { closeActiveModal, toggleLabelAtIndex, moveLabelSelection },
		themeModal: { themeModal, closeThemeModal, updateThemeQuery, toggleThemeMode, toggleThemeTone, moveThemeSelection },
		openRepositoryModal: { closeActiveModal, openRepositoryFromInput },
		commentModal: { closeActiveModal, submitCommentModal, editComment },
		deleteCommentModal: { closeActiveModal, confirmDeleteComment },
		commandPalette: { closeActiveModal, selectedCommand, runCommandPaletteCommand, moveCommandPaletteSelection },
		filterModeCtx: {
			cancelFilter: () => {
				setFilterDraft(filterQuery)
				setFilterMode(false)
			},
			commitFilter: () => {
				setFilterQuery(filterDraft)
				setFilterMode(false)
			},
		},
		diff: {
			halfPage,
			diffCommentRangeActive,
			setDiffCommentRangeStartIndex,
			runCommandById,
			openSelectedDiffComment,
			moveDiffCommentAnchor,
			moveDiffCommentToBoundary,
			alignSelectedDiffCommentAnchor,
			selectDiffCommentSide,
		},
		detail: { halfPage, scrollDetailFullViewBy, scrollDetailFullViewTo, runCommandById },
		commentsView: {
			halfPage,
			visibleCount: commentsRowCount,
			canEditSelected: canEditComment(selectedOrderedComment),
			moveCommentsSelection,
			setCommentsSelection,
			closeCommentsView,
			openSelectedCommentInBrowser,
			refreshSelectedComments,
			confirmCommentSelection,
			runCommandById,
		},
		listNav: {
			halfPage,
			visibleCount: activeWorkspaceSurface === "repos" ? repositoryItems.length : activeWorkspaceSurface === "pullRequests" ? visiblePullRequests.length : issues.length,
			hasFilter: filterQuery.length > 0,
			activeSurface: activeWorkspaceSurface,
			surfaces: workspaceTabSurfaces,
			canGoUpWorkspace: selectedRepository !== null,
			canScrollDetailPreview:
				(activeWorkspaceSurface === "pullRequests" && selectedPullRequest !== null) ||
				(activeWorkspaceSurface === "issues" && !isWideLayout && selectedIssue !== null) ||
				(activeWorkspaceSurface === "repos" && !isWideLayout && selectedRepositoryItem !== null),
			runCommandById,
			openSelection: () => {
				if (activeWorkspaceSurface === "repos") openSelectedRepository()
				else runCommandById("detail.open")
			},
			toggleFavoriteRepository,
			goUpWorkspace: () => {
				goUpWorkspaceScope()
			},
			switchQueueMode,
			switchWorkspaceSurface,
			cycleWorkspaceSurface,
			scrollDetailPreviewBy,
			scrollDetailPreviewTo,
			stepSelected,
			stepSelectedUp,
			stepSelectedDown,
			stepSelectedUpWrap,
			stepSelectedDownWithLoadMore,
			moveSelectedToPreviousGroup,
			moveSelectedToNextGroup,
			setSelected: (index) =>
				activeWorkspaceSurface === "repos" ? setSelectedRepositoryIndex(index) : activeWorkspaceSurface === "issues" ? setSelectedIssueIndex(index) : setSelectedIndex(index),
		},
		openCommandPalette: () => runCommandById("command.open"),
		handleQuitOrClose,
	})

	useKeymap(appKeymap, appCtx, useOpenTuiSubscribe())

	useTextInputDispatcher({
		commandPaletteActive,
		openRepositoryModalActive,
		themeModalActive,
		commentModalActive,
		submitReviewModalActive,
		changedFilesModalActive,
		labelModalActive,
		filterMode,
		detailFullView,
		diffFullView,
		commentsViewActive,
		themeModal,
		submitReviewModal,
		workspaceTabSurfaces,
		activeWorkspaceSurface,
		switchWorkspaceSurface,
		setCommandPalette,
		setOpenRepositoryModal,
		setChangedFilesModal,
		setLabelModal,
		setFilterDraft,
		editThemeQuery,
		editComment,
		editSubmitReview,
	})

	if (isInitialLoading) {
		return (
			<box width={terminalWidth} height={terminalHeight} flexDirection="column" backgroundColor={colors.background}>
				<LoadingLogoPane content={detailPlaceholderContent} width={contentWidth} height={terminalHeight} frame={loadingFrame} />
			</box>
		)
	}

	const fullscreenContentWidth = Math.max(24, contentWidth - 2)
	const fullscreenBodyLines = Math.max(8, terminalHeight - 8)
	const fullscreenDetailHeaderHeight = getDetailHeaderHeight(selectedPullRequest, contentWidth, isWideLayout, selectedComments, selectedCommentsStatus)
	const fullscreenDetailBodyViewportHeight = Math.max(1, wideBodyHeight - fullscreenDetailHeaderHeight)
	const fullscreenDetailBodyHeight = getScrollableDetailBodyHeight(selectedPullRequest, fullscreenContentWidth)
	const fullscreenDetailBodyScrollable = fullscreenDetailBodyHeight > fullscreenDetailBodyViewportHeight
	const wideDetailHeaderHeight = getDetailHeaderHeight(selectedPullRequest, rightPaneWidth, true, selectedComments, selectedCommentsStatus)
	const wideDetailBodyViewportHeight = Math.max(1, wideBodyHeight - wideDetailHeaderHeight)
	const wideDetailBodyHeight = getScrollableDetailBodyHeight(selectedPullRequest, rightContentWidth)
	const wideDetailBodyScrollable = wideDetailBodyHeight > wideDetailBodyViewportHeight
	const narrowPullRequestListHeight = Math.max(1, Math.ceil((wideBodyHeight - 1) / 2))
	const narrowDetailsPaneHeight = Math.max(1, wideBodyHeight - narrowPullRequestListHeight - 1)
	const narrowRepoListHeight = narrowPullRequestListHeight
	const narrowRepoDetailHeight = narrowDetailsPaneHeight
	const narrowIssueListHeight = narrowPullRequestListHeight
	const narrowIssueDetailHeight = narrowDetailsPaneHeight
	const narrowDetailsContentHeight = getDetailsPaneHeight({
		pullRequest: selectedPullRequest,
		contentWidth: fullscreenContentWidth,
		paneWidth: contentWidth,
		comments: selectedComments,
		commentsStatus: selectedCommentsStatus,
	})
	const narrowDetailsPaneNeedsScroll = narrowDetailsContentHeight > narrowDetailsPaneHeight
	const widePullRequestListNeedsScroll = pullRequestStatus === "ready" && pullRequestListRows.length > wideBodyHeight
	const narrowPullRequestListNeedsScroll = pullRequestStatus === "ready" && pullRequestListRows.length > narrowPullRequestListHeight
	const detailJunctions = isSelectedPullRequestDetailLoading
		? []
		: getDetailJunctionRows({
				pullRequest: selectedPullRequest,
				paneWidth: rightPaneWidth,
				showChecks: true,
				comments: selectedComments,
				commentsStatus: selectedCommentsStatus,
			})

	const prListProps = {
		groups: visibleGroups,
		selectedUrl: selectedPullRequest?.url ?? null,
		status: pullRequestStatus,
		error: pullRequestError,
		filterText: visibleFilterText,
		showFilterBar: filterMode || filterQuery.length > 0,
		isFilterEditing: filterMode,
		loadedCount: loadedPullRequestCount,
		hasMore: hasMorePullRequests,
		isLoadingMore: isLoadingMorePullRequests,
		loadingIndicator,
		onSelectPullRequest: selectPullRequestByUrl,
		showTitle: false,
		showRepositoryGroups: selectedRepository === null,
	} as const
	const issueListProps = {
		issues,
		selectedIndex: selectedIssueIndex,
		status: issuesStatus,
		error: issuesError,
		repository: selectedRepository,
		filterText: visibleFilterText,
		showFilterBar: activeWorkspaceSurface === "issues" && (filterMode || filterQuery.length > 0),
		isFilterEditing: filterMode,
		onSelectIssue: setSelectedIssueIndex,
	} as const
	const repoListProps = {
		repositories: repositoryItems,
		selectedIndex: selectedRepositoryIndex,
		filterText: visibleFilterText,
		showFilterBar: activeWorkspaceSurface === "repos" && (filterMode || filterQuery.length > 0),
		isFilterEditing: filterMode,
		onSelectRepository: setSelectedRepositoryIndex,
	} as const
	const widePullRequestList = (
		<box paddingLeft={sectionPadding} paddingRight={0}>
			<PullRequestList key={`wide-${leftContentWidth}`} {...prListProps} contentWidth={leftContentWidth} />
		</box>
	)
	const narrowPullRequestList = (
		<box paddingLeft={sectionPadding} paddingRight={sectionPadding}>
			<PullRequestList key={`narrow-${fullscreenContentWidth}`} {...prListProps} contentWidth={fullscreenContentWidth} />
		</box>
	)
	const showWideSplit = activeWorkspaceSurface === "pullRequests" && isWideLayout && !detailFullView && !diffFullView && !commentsViewActive
	const showRepoSplit = activeWorkspaceSurface === "repos" && isWideLayout && !detailFullView && !diffFullView && !commentsViewActive
	const showIssueSplit = activeWorkspaceSurface === "issues" && isWideLayout && !detailFullView && !diffFullView && !commentsViewActive
	const issueJunctions = showIssueSplit ? getIssueDetailJunctionRows(selectedIssue, rightPaneWidth) : []
	const showPaneSplit = showWideSplit || showRepoSplit || showIssueSplit
	const issueListNeedsScroll = issuesStatus === "ready" && issues.length > wideBodyHeight
	const narrowIssueListNeedsScroll = issuesStatus === "ready" && issues.length > narrowIssueListHeight
	const repoListNeedsScroll = repositoryItems.length > wideBodyHeight
	const narrowRepoListNeedsScroll = repositoryItems.length > narrowRepoListHeight
	const workspaceTabCounts = {
		repos: repositoryItems.length,
		pullRequests: hasMorePullRequests ? `${visiblePullRequests.length}+` : visiblePullRequests.length,
		issues: issues.length,
	}
	const workspaceTabJunctions = workspaceTabSeparatorColumns(workspaceTabCounts, workspaceTabSurfaces)
	const workspaceTopDividerJunctions = showWorkspaceTabs ? workspaceTabJunctions.map((at) => ({ at, char: "┬" })) : []
	const workspaceBottomDividerJunctions = showWorkspaceTabs
		? [...workspaceTabJunctions.map((at) => ({ at, char: "┴" })), ...(showPaneSplit ? [{ at: dividerJunctionAt, char: "┬" }] : [])]
		: []

	const longestLabelName = labelModal.availableLabels.reduce((max, label) => Math.max(max, label.name.length), 0)
	const longestDiffFileName = changedFilesModalActive ? readyDiffFiles.reduce((max, file) => Math.max(max, file.name.length), 0) : 0
	const sizedModal = (minW: number, maxW: number, padX: number, maxH: number) => {
		const w = Math.min(maxW, Math.max(minW, contentWidth - padX))
		const h = Math.min(maxH, terminalHeight - 4)
		return { width: w, height: h, left: centeredOffset(contentWidth, w), top: centeredOffset(terminalHeight, h) }
	}
	const labelLayout = (() => {
		const width = Math.min(Math.max(42, longestLabelName + 16), 56, contentWidth - 4)
		const height = Math.min(20, terminalHeight - 4)
		return { width, height, left: centeredOffset(contentWidth, width), top: centeredOffset(terminalHeight, height) }
	})()
	const changedFilesLayout = (() => {
		const width = changedFilesModalActive ? Math.min(Math.max(46, longestDiffFileName + 16), 88, contentWidth - 4) : 46
		const height = Math.min(22, terminalHeight - 4)
		return { width, height, left: centeredOffset(contentWidth, width), top: centeredOffset(terminalHeight, height) }
	})()
	const closeLayout = sizedModal(46, 68, 12, 12)
	const deleteCommentLayout = sizedModal(46, 68, 12, 12)
	const pullRequestStateLayout = sizedModal(46, 68, 12, 9)
	const commentLayout = sizedModal(46, 76, 8, 16)
	const commentThreadLayout = sizedModal(50, 86, 8, 22)
	const submitReviewLayout = sizedModal(54, 84, 8, 18)
	const mergeLayout = sizedModal(46, 68, 14, 20)
	const themeLayout = sizedModal(38, 58, 12, 16)
	const openRepositoryLayout = sizedModal(46, 76, 8, 8)
	const commandPaletteLayout = sizedModal(50, 88, 8, 24)
	const commentAnchorLabel = ((): string => {
		if (commentModalActive) {
			if (commentModal.target.kind === "issue") return selectedCommentSubject ? `New comment on #${selectedCommentSubject.number}` : "New comment"
			if (commentModal.target.kind === "reply") return `Reply on ${commentModal.target.anchorLabel}`
			if (commentModal.target.kind === "edit") return commentModal.target.anchorLabel
		}
		return selectedDiffCommentAnchor && selectedDiffCommentLabel ? `${selectedDiffCommentAnchor.path} ${selectedDiffCommentLabel}` : "No diff line selected"
	})()

	return (
		<box width={terminalWidth} height={terminalHeight} flexDirection="column" backgroundColor={colors.background}>
			<box paddingLeft={1} paddingRight={1} flexDirection="column" backgroundColor={colors.background}>
				<PlainLine text={headerLine} fg={colors.muted} bold />
			</box>
			<Divider width={contentWidth} junctions={workspaceTopDividerJunctions} />
			{showWorkspaceTabs ? (
				<>
					<box paddingRight={1} backgroundColor={colors.background}>
						<WorkspaceTabs
							activeSurface={activeWorkspaceSurface}
							width={Math.max(24, contentWidth - 1)}
							surfaces={workspaceTabSurfaces}
							counts={workspaceTabCounts}
							onSelect={switchWorkspaceSurface}
						/>
					</box>
					<Divider width={contentWidth} junctions={workspaceBottomDividerJunctions} />
				</>
			) : null}
			{activeWorkspaceSurface === "repos" && !commentsViewActive && !diffFullView && !detailFullView ? (
				<RepoWorkspace
					isWideLayout={isWideLayout}
					wideBodyHeight={wideBodyHeight}
					contentWidth={contentWidth}
					leftPaneWidth={leftPaneWidth}
					rightPaneWidth={rightPaneWidth}
					leftContentWidth={leftContentWidth}
					fullscreenContentWidth={fullscreenContentWidth}
					sectionPadding={sectionPadding}
					narrowRepoListHeight={narrowRepoListHeight}
					narrowRepoDetailHeight={narrowRepoDetailHeight}
					repoListNeedsScroll={repoListNeedsScroll}
					narrowRepoListNeedsScroll={narrowRepoListNeedsScroll}
					repoListProps={repoListProps}
					selectedRepositoryItem={selectedRepositoryItem}
					detailPreviewScrollRef={detailPreviewScrollRef}
				/>
			) : activeWorkspaceSurface === "issues" && !commentsViewActive && !diffFullView && !detailFullView ? (
				<IssuesWorkspace
					isWideLayout={isWideLayout}
					wideBodyHeight={wideBodyHeight}
					contentWidth={contentWidth}
					leftPaneWidth={leftPaneWidth}
					rightPaneWidth={rightPaneWidth}
					leftContentWidth={leftContentWidth}
					fullscreenContentWidth={fullscreenContentWidth}
					sectionPadding={sectionPadding}
					narrowIssueListHeight={narrowIssueListHeight}
					narrowIssueDetailHeight={narrowIssueDetailHeight}
					issueListNeedsScroll={issueListNeedsScroll}
					narrowIssueListNeedsScroll={narrowIssueListNeedsScroll}
					issueJunctions={issueJunctions}
					issueListProps={issueListProps}
					selectedIssue={selectedIssue}
					issueListScrollRef={issueListScrollRef}
					detailPreviewScrollRef={detailPreviewScrollRef}
				/>
			) : commentsViewActive && selectedCommentSubject ? (
				<CommentsPane
					item={selectedCommentSubject}
					comments={selectedComments}
					orderedComments={orderedComments}
					status={selectedCommentsStatus}
					selectedIndex={commentsViewSelection}
					contentWidth={fullscreenContentWidth}
					paneWidth={contentWidth}
					height={wideBodyHeight}
					loadingIndicator={loadingIndicator}
					themeGeneration={systemThemeGeneration}
				/>
			) : diffFullView ? (
				<PullRequestDiffPane
					pullRequest={selectedPullRequest}
					diffState={displayedDiffState}
					stackedFiles={stackedDiffFiles}
					scrollTop={diffScrollTop}
					view={effectiveDiffRenderView}
					whitespaceMode={diffWhitespaceMode}
					wrapMode={diffWrapMode}
					paneWidth={contentWidth}
					height={wideBodyHeight}
					loadingIndicator={loadingIndicator}
					scrollRef={diffScrollRef}
					setDiffRef={setDiffRenderableRef}
					selectedCommentAnchor={selectedDiffCommentAnchor}
					selectedCommentLabel={selectedDiffCommentLabel}
					selectedCommentThread={selectedDiffCommentThread}
					onSelectCommentLine={selectDiffCommentLine}
					themeId={themeId}
					themeGeneration={systemThemeGeneration}
				/>
			) : detailFullView && activeWorkspaceSurface === "issues" ? (
				<IssueDetailPane issue={selectedIssue} width={contentWidth} height={wideBodyHeight} />
			) : detailFullView && isSelectedPullRequestDetailLoading && selectedPullRequest ? (
				<box flexGrow={1} flexDirection="column">
					<DetailHeader
						pullRequest={selectedPullRequest}
						contentWidth={fullscreenContentWidth}
						paneWidth={contentWidth}
						showChecks={isWideLayout}
						comments={selectedComments}
						commentsStatus={selectedCommentsStatus}
					/>
					<Filler rows={Math.max(1, wideBodyHeight - fullscreenDetailHeaderHeight)} prefix="detail-loading-full" />
				</box>
			) : isWideLayout && detailFullView ? (
				<box flexGrow={1} flexDirection="column">
					{selectedPullRequest ? (
						<>
							<DetailHeader
								pullRequest={selectedPullRequest}
								contentWidth={fullscreenContentWidth}
								paneWidth={contentWidth}
								showChecks
								comments={selectedComments}
								commentsStatus={selectedCommentsStatus}
							/>
							<scrollbox ref={detailScrollRef} focusable={false} flexGrow={1} verticalScrollbarOptions={{ visible: fullscreenDetailBodyScrollable }}>
								<DetailBody
									pullRequest={selectedPullRequest}
									contentWidth={fullscreenContentWidth}
									bodyLines={fullscreenBodyLines}
									bodyLineLimit={DETAIL_BODY_SCROLL_LIMIT}
									loadingIndicator={loadingIndicator}
									themeId={themeId}
									themeGeneration={systemThemeGeneration}
									onLinkOpen={openLinkInBrowser}
								/>
							</scrollbox>
						</>
					) : (
						<DetailsPane
							pullRequest={null}
							contentWidth={fullscreenContentWidth}
							paneWidth={contentWidth}
							placeholderContent={detailPlaceholderContent}
							loadingIndicator={loadingIndicator}
							themeId={themeId}
							themeGeneration={systemThemeGeneration}
							onLinkOpen={openLinkInBrowser}
						/>
					)}
				</box>
			) : isWideLayout ? (
				<SplitPane
					height={wideBodyHeight}
					leftWidth={leftPaneWidth}
					rightWidth={rightPaneWidth}
					junctionRows={detailJunctions}
					left={
						widePullRequestListNeedsScroll ? (
							<scrollbox ref={prListScrollRef} focusable={false} height={wideBodyHeight} flexGrow={0}>
								{widePullRequestList}
							</scrollbox>
						) : (
							<box height={wideBodyHeight} flexDirection="column">
								{widePullRequestList}
							</box>
						)
					}
					right={
						isSelectedPullRequestDetailLoading && selectedPullRequest ? (
							<>
								<DetailHeader
									pullRequest={selectedPullRequest}
									contentWidth={rightContentWidth}
									paneWidth={rightPaneWidth}
									showChecks
									comments={selectedComments}
									commentsStatus={selectedCommentsStatus}
								/>
								<Filler rows={Math.max(1, wideBodyHeight - wideDetailHeaderHeight)} prefix="detail-loading-preview" />
							</>
						) : selectedPullRequest ? (
							<>
								<DetailHeader
									pullRequest={selectedPullRequest}
									contentWidth={rightContentWidth}
									paneWidth={rightPaneWidth}
									showChecks
									comments={selectedComments}
									commentsStatus={selectedCommentsStatus}
								/>
								<scrollbox ref={detailPreviewScrollRef} flexGrow={1} verticalScrollbarOptions={{ visible: wideDetailBodyScrollable }}>
									<DetailBody
										pullRequest={selectedPullRequest}
										contentWidth={rightContentWidth}
										bodyLines={wideDetailLines}
										bodyLineLimit={DETAIL_BODY_SCROLL_LIMIT}
										loadingIndicator={loadingIndicator}
										themeId={themeId}
										themeGeneration={systemThemeGeneration}
										onLinkOpen={openLinkInBrowser}
									/>
								</scrollbox>
							</>
						) : (
							<DetailPlaceholder content={detailPlaceholderContent} paneWidth={rightPaneWidth} />
						)
					}
				/>
			) : detailFullView ? (
				<box flexGrow={1} flexDirection="column">
					{selectedPullRequest ? (
						<>
							<DetailHeader
								pullRequest={selectedPullRequest}
								contentWidth={fullscreenContentWidth}
								paneWidth={contentWidth}
								comments={selectedComments}
								commentsStatus={selectedCommentsStatus}
							/>
							<scrollbox ref={detailScrollRef} focusable={false} flexGrow={1} verticalScrollbarOptions={{ visible: fullscreenDetailBodyScrollable }}>
								<DetailBody
									pullRequest={selectedPullRequest}
									contentWidth={fullscreenContentWidth}
									bodyLines={fullscreenBodyLines}
									bodyLineLimit={DETAIL_BODY_SCROLL_LIMIT}
									loadingIndicator={loadingIndicator}
									themeId={themeId}
									themeGeneration={systemThemeGeneration}
									onLinkOpen={openLinkInBrowser}
								/>
							</scrollbox>
						</>
					) : (
						<DetailsPane
							pullRequest={null}
							contentWidth={fullscreenContentWidth}
							paneWidth={contentWidth}
							placeholderContent={detailPlaceholderContent}
							loadingIndicator={loadingIndicator}
							themeId={themeId}
							themeGeneration={systemThemeGeneration}
							onLinkOpen={openLinkInBrowser}
						/>
					)}
				</box>
			) : (
				<box key="narrow-main" height={wideBodyHeight} flexDirection="column">
					{narrowPullRequestListNeedsScroll ? (
						<scrollbox ref={prListScrollRef} focusable={false} height={narrowPullRequestListHeight} flexGrow={0}>
							{narrowPullRequestList}
						</scrollbox>
					) : (
						<box height={narrowPullRequestListHeight} flexDirection="column">
							{narrowPullRequestList}
						</box>
					)}
					<Divider width={contentWidth} />
					<scrollbox
						ref={detailPreviewScrollRef}
						focusable={false}
						height={narrowDetailsPaneHeight}
						flexGrow={0}
						verticalScrollbarOptions={{ visible: narrowDetailsPaneNeedsScroll }}
					>
						<DetailsPane
							pullRequest={selectedPullRequest}
							contentWidth={fullscreenContentWidth}
							paneWidth={contentWidth}
							comments={selectedComments}
							commentsStatus={selectedCommentsStatus}
							placeholderContent={detailPlaceholderContent}
							loadingIndicator={loadingIndicator}
							themeId={themeId}
							themeGeneration={systemThemeGeneration}
							onLinkOpen={openLinkInBrowser}
						/>
					</scrollbox>
				</box>
			)}

			{showPaneSplit ? <Divider width={contentWidth} junctionAt={dividerJunctionAt} junctionChar="┴" /> : <Divider width={contentWidth} />}
			<box paddingLeft={1} paddingRight={1} backgroundColor={colors.background}>
				{footerNotice ? (
					<PlainLine text={footerNotice} fg={colors.count} />
				) : (
					<FooterHints
						filterEditing={filterMode}
						showFilterClear={filterMode || filterQuery.length > 0}
						detailFullView={detailFullView}
						diffFullView={diffFullView}
						diffRangeActive={diffCommentRangeActive}
						commentsViewActive={commentsViewActive}
						commentsViewOnRealComment={commentsViewActive && selectedCommentsStatus === "ready" && selectedOrderedComment !== null}
						commentsViewCanEditSelected={canEditComment(selectedOrderedComment)}
						commentsViewCount={selectedComments.length}
						hasSelection={selectedCommentSubject !== null}
						canOpenDetails={selectedCommentSubject !== null}
						canOpenRepository={activeWorkspaceSurface === "repos" && selectedRepositoryItem !== null}
						canOpenDiff={activeWorkspaceSurface === "pullRequests" && selectedPullRequest !== null}
						canOpenComments={selectedCommentSubject !== null}
						hasComments={selectedCommentCount > 0}
						hasError={pullRequestStatus === "error"}
						isLoading={isActiveSurfaceLoading || closeModal.running || pullRequestStateModal.running || mergeModal.running || submitReviewModal.running}
						loadingIndicator={loadingIndicator}
						retryProgress={retryProgress}
					/>
				)}
			</box>
			<WorkspaceModals
				loadingIndicator={loadingIndicator}
				selectedItemLabels={selectedItemLabels}
				commentAnchorLabel={commentAnchorLabel}
				selectedDiffCommentThread={selectedDiffCommentThread}
				changedFileResults={changedFileResults}
				readyDiffFileCount={readyDiffFiles.length}
				commandPaletteCommands={commandPaletteCommands}
				selectedCommandIndex={selectedCommandIndex}
				onSelectCommandIndex={selectCommandPaletteIndex}
				onRunCommand={runCommandPaletteCommand}
				labelModalActive={labelModalActive}
				closeModalActive={closeModalActive}
				pullRequestStateModalActive={pullRequestStateModalActive}
				commentModalActive={commentModalActive}
				deleteCommentModalActive={deleteCommentModalActive}
				commentThreadModalActive={commentThreadModalActive}
				changedFilesModalActive={changedFilesModalActive}
				submitReviewModalActive={submitReviewModalActive}
				mergeModalActive={mergeModalActive}
				themeModalActive={themeModalActive}
				openRepositoryModalActive={openRepositoryModalActive}
				commandPaletteActive={commandPaletteActive}
				labelModal={labelModal}
				closeModal={closeModal}
				pullRequestStateModal={pullRequestStateModal}
				commentModal={commentModal}
				deleteCommentModal={deleteCommentModal}
				commentThreadModal={commentThreadModal}
				changedFilesModal={changedFilesModal}
				submitReviewModal={submitReviewModal}
				mergeModal={mergeModal}
				themeModal={themeModal}
				openRepositoryModal={openRepositoryModal}
				commandPalette={commandPalette}
				labelLayout={labelLayout}
				closeLayout={closeLayout}
				pullRequestStateLayout={pullRequestStateLayout}
				commentLayout={commentLayout}
				deleteCommentLayout={deleteCommentLayout}
				commentThreadLayout={commentThreadLayout}
				changedFilesLayout={changedFilesLayout}
				submitReviewLayout={submitReviewLayout}
				mergeLayout={mergeLayout}
				themeLayout={themeLayout}
				openRepositoryLayout={openRepositoryLayout}
				commandPaletteLayout={commandPaletteLayout}
			/>
		</box>
	)
}
