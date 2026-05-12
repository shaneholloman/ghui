import type { AppCommand } from "./commands.js"
import { defineCommand } from "./commands.js"
import type { IssueItem, LoadStatus, PullRequestItem, PullRequestReviewEvent } from "./domain.js"
import type { DiffView, DiffWhitespaceMode, DiffWrapMode } from "./ui/diff.js"
import { type PullRequestView, viewEquals, viewLabel, viewMode } from "./pullRequestViews.js"
import { workspaceSurfaceLabels, workspaceSurfaces, type WorkspaceSurface } from "./workspaceSurfaces.js"

interface AppCommandActions {
	readonly openCommandPalette: () => void
	readonly refreshPullRequests: (message?: string, options?: { readonly resetTransientState?: boolean }) => void
	readonly openFilter: () => void
	readonly clearFilter: () => void
	readonly openThemeModal: () => void
	readonly openRepositoryPicker: () => void
	readonly switchWorkspaceSurface: (surface: WorkspaceSurface) => void
	readonly loadMorePullRequests: () => void
	readonly switchViewTo: (view: PullRequestView) => void
	readonly openDetails: () => void
	readonly closeDetails: () => void
	readonly openDiffView: () => void
	readonly closeDiffView: () => void
	readonly openCommentsView: () => void
	readonly closeCommentsView: () => void
	readonly openNewIssueCommentModal: () => void
	readonly openReplyToSelectedComment: () => void
	readonly openEditSelectedComment: () => void
	readonly openDeleteSelectedComment: () => void
	readonly reloadDiff: () => void
	readonly toggleDiffRenderView: () => void
	readonly toggleDiffWrapMode: () => void
	readonly toggleDiffWhitespaceMode: () => void
	readonly openChangedFilesModal: () => void
	readonly jumpDiffFile: (delta: 1 | -1) => void
	readonly openSelectedDiffComment: () => void
	readonly toggleDiffCommentRange: () => void
	readonly moveDiffCommentThread: (delta: 1 | -1) => void
	readonly openDiffCommentModal: () => void
	readonly openSubmitReviewModal: (initialEvent?: PullRequestReviewEvent) => void
	readonly openPullRequestStateModal: () => void
	readonly openLabelModal: () => void
	readonly openMergeModal: () => void
	readonly openCloseModal: () => void
	readonly openPullRequestInBrowser: () => void
	readonly copyPullRequestMetadata: () => void
	readonly copyIssueMetadata: () => void
	readonly quit: () => void
}

interface BuildAppCommandsInput {
	readonly pullRequestStatus: LoadStatus
	readonly selectedRepository: string | null
	readonly activeWorkspaceSurface: WorkspaceSurface
	readonly activeViews: readonly PullRequestView[]
	readonly activeView: PullRequestView
	readonly loadedPullRequestCount: number
	readonly hasMorePullRequests: boolean
	readonly isLoadingMorePullRequests: boolean
	readonly selectedPullRequest: PullRequestItem | null
	readonly selectedIssue: IssueItem | null
	readonly detailFullView: boolean
	readonly diffFullView: boolean
	readonly commentsViewActive: boolean
	readonly hasSelectedComment: boolean
	readonly canEditSelectedComment: boolean
	readonly diffReady: boolean
	readonly effectiveDiffRenderView: DiffView
	readonly diffWrapMode: DiffWrapMode
	readonly diffWhitespaceMode: DiffWhitespaceMode
	readonly readyDiffFileCount: number
	readonly diffFileIndex: number
	readonly diffRangeActive: boolean
	readonly selectedDiffCommentAnchorLabel: string | null
	readonly selectedDiffCommentThreadCount: number
	readonly hasDiffCommentThreads: boolean
	readonly actions: AppCommandActions
}

export const buildAppCommands = ({
	pullRequestStatus,
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
	hasSelectedComment,
	canEditSelectedComment,
	diffReady,
	effectiveDiffRenderView,
	diffWrapMode,
	diffWhitespaceMode,
	readyDiffFileCount,
	diffFileIndex,
	diffRangeActive,
	selectedDiffCommentAnchorLabel,
	selectedDiffCommentThreadCount,
	hasDiffCommentThreads,
	actions,
}: BuildAppCommandsInput): readonly AppCommand[] => {
	const selectedPullRequestLabel = selectedPullRequest ? `#${selectedPullRequest.number} ${selectedPullRequest.repository}` : "No pull request selected"
	const selectedIssueLabel = selectedIssue ? `#${selectedIssue.number} ${selectedIssue.repository}` : "No issue selected"
	const selectedItemLabel = activeWorkspaceSurface === "issues" ? selectedIssueLabel : selectedPullRequestLabel
	const pullRequestSurfaceReason = activeWorkspaceSurface === "pullRequests" ? null : "Pull request surface is not active."
	const noPullRequestReason = pullRequestSurfaceReason ?? (selectedPullRequest ? null : "Select a pull request first.")
	const noSelectedItemReason = activeWorkspaceSurface === "issues" ? (selectedIssue ? null : "Select an issue first.") : noPullRequestReason
	const noOpenPullRequestReason = selectedPullRequest?.state === "open" ? null : selectedPullRequest ? "Pull request is not open." : noPullRequestReason
	const diffReadyReason = selectedPullRequest ? (diffReady ? null : "Load the diff before running this command.") : noPullRequestReason
	const diffOpenReadyReason = diffFullView ? diffReadyReason : "Open a diff first."
	const selectedDiffLineReason = diffFullView && diffReady ? (selectedDiffCommentAnchorLabel ? null : "No diff line selected.") : diffOpenReadyReason
	const diffThreadReason = diffFullView && diffReady ? (hasDiffCommentThreads ? null : "No diff comments loaded.") : diffOpenReadyReason
	const changedFilesReason = diffFullView && diffReady ? (readyDiffFileCount > 0 ? null : "No changed files loaded.") : diffOpenReadyReason
	const selectedCommentReason = noSelectedItemReason ?? (commentsViewActive ? (hasSelectedComment ? null : "No comment selected.") : "Open comments first.")
	const ownCommentReason = selectedCommentReason ?? (canEditSelectedComment ? null : "Only your own (synced) comments can be edited or deleted.")
	const loadMoreDisabledReason = isLoadingMorePullRequests ? "Already loading more pull requests." : hasMorePullRequests ? null : "No more pull requests loaded by this view."

	const forSelected = (command: Omit<AppCommand, "subtitle" | "disabledReason"> & { readonly requireOpen?: boolean }): AppCommand => {
		const { requireOpen, ...rest } = command
		return defineCommand({
			...rest,
			subtitle: selectedPullRequestLabel,
			disabledReason: requireOpen ? noOpenPullRequestReason : noPullRequestReason,
		})
	}

	return [
		defineCommand({
			id: "pull.refresh",
			title: pullRequestStatus === "error" ? "Retry loading pull requests" : "Refresh pull requests",
			scope: "Global",
			subtitle: "Fetch the latest queue from GitHub",
			shortcut: "r",
			disabledReason: pullRequestSurfaceReason,
			keywords: ["reload", "sync"],
			run: () => actions.refreshPullRequests("Refreshed", { resetTransientState: true }),
		}),
		defineCommand({
			id: "theme.open",
			title: "Choose theme",
			scope: "Global",
			subtitle: "Preview and persist a terminal color theme",
			shortcut: "t",
			keywords: ["colors", "appearance"],
			run: actions.openThemeModal,
		}),
		defineCommand({
			id: "repository.open",
			title: "Open repository...",
			scope: "View",
			subtitle: selectedRepository ? `Current repository: ${selectedRepository}` : "Enter owner/name or a GitHub URL",
			keywords: ["repo", "repository", "owner", "github"],
			run: actions.openRepositoryPicker,
		}),
		...workspaceSurfaces.map((surface, index) =>
			defineCommand({
				id: `workspace.${surface}`,
				title: `Show ${workspaceSurfaceLabels[surface]}`,
				scope: "View" as const,
				subtitle: activeWorkspaceSurface === surface ? "Already showing this surface" : "Switch project surface",
				shortcut: `${index + 1}`,
				keywords: [workspaceSurfaceLabels[surface], "workspace", "surface", "tab"],
				disabledReason: activeWorkspaceSurface === surface ? "Already showing this surface." : null,
				run: () => actions.switchWorkspaceSurface(surface),
			}),
		),
		...activeViews.map((view) =>
			defineCommand({
				id: view._tag === "Repository" ? "view.repository" : `view.${view.mode}`,
				title: `Show ${viewLabel(view)} view`,
				scope: "View" as const,
				subtitle: viewEquals(view, activeView) ? "Already showing this view" : "Switch pull request view",
				keywords: [viewMode(view), viewLabel(view), "queue", "view"],
				disabledReason: viewEquals(view, activeView) ? "Already showing this view." : null,
				run: () => actions.switchViewTo(view),
			}),
		),
		defineCommand({
			id: "pull.load-more",
			title: "Load more pull requests",
			scope: "Navigation",
			subtitle: `${loadedPullRequestCount} loaded`,
			disabledReason: pullRequestSurfaceReason ?? loadMoreDisabledReason,
			keywords: ["next page", "pagination", "more"],
			run: actions.loadMorePullRequests,
		}),
		defineCommand({
			id: "detail.open",
			title: "Open details",
			scope: "View",
			subtitle: selectedItemLabel,
			shortcut: "enter",
			disabledReason: noSelectedItemReason,
			run: actions.openDetails,
		}),
		defineCommand({
			id: "detail.close",
			title: "Close details view",
			scope: "Pull request",
			subtitle: "Return to the queue",
			shortcut: "esc",
			disabledReason: detailFullView ? null : "Details view is not open.",
			run: actions.closeDetails,
		}),
		forSelected({
			id: "diff.open",
			title: "Open diff",
			scope: "Diff",
			shortcut: "d",
			keywords: ["files", "patch"],
			run: actions.openDiffView,
		}),
		defineCommand({
			id: "comments.open",
			title: "Open comments",
			scope: "Comments",
			subtitle: selectedItemLabel,
			shortcut: "c",
			keywords: ["conversation", "discussion", "review"],
			disabledReason: noSelectedItemReason,
			run: actions.openCommentsView,
		}),
		defineCommand({
			id: "comments.new",
			title: "New comment",
			scope: "Comments",
			subtitle: selectedItemLabel,
			shortcut: "a",
			keywords: ["add", "post", "issue comment"],
			disabledReason: noSelectedItemReason,
			run: actions.openNewIssueCommentModal,
		}),
		defineCommand({
			id: "comments.reply",
			title: "Reply to comment",
			scope: "Comments",
			subtitle: selectedItemLabel,
			shortcut: "shift-r",
			disabledReason: selectedCommentReason,
			keywords: ["respond", "thread"],
			run: actions.openReplyToSelectedComment,
		}),
		defineCommand({
			id: "comments.edit",
			title: "Edit comment",
			scope: "Comments",
			subtitle: selectedItemLabel,
			shortcut: "e",
			disabledReason: ownCommentReason,
			keywords: ["update", "modify", "rewrite"],
			run: actions.openEditSelectedComment,
		}),
		defineCommand({
			id: "comments.delete",
			title: "Delete comment",
			scope: "Comments",
			subtitle: selectedItemLabel,
			shortcut: "x",
			disabledReason: ownCommentReason,
			keywords: ["remove", "destroy"],
			run: actions.openDeleteSelectedComment,
		}),
		defineCommand({
			id: "diff.close",
			title: "Close diff view",
			scope: "Diff",
			subtitle: "Return to the queue or detail view",
			shortcut: "esc",
			disabledReason: diffFullView ? null : "Diff view is not open.",
			run: actions.closeDiffView,
		}),
		defineCommand({
			id: "diff.reload",
			title: "Reload diff",
			scope: "Diff",
			subtitle: selectedPullRequestLabel,
			shortcut: "r",
			disabledReason: diffFullView && selectedPullRequest ? null : "Open a pull request diff first.",
			keywords: ["refresh", "comments"],
			run: actions.reloadDiff,
		}),
		defineCommand({
			id: "diff.toggle-view",
			title: "Toggle diff split/unified view",
			scope: "Diff",
			subtitle: effectiveDiffRenderView === "split" ? "Switch to unified view" : "Switch to split view",
			shortcut: "shift-v",
			disabledReason: diffFullView ? null : "Open a diff first.",
			run: actions.toggleDiffRenderView,
		}),
		defineCommand({
			id: "diff.toggle-wrap",
			title: "Toggle diff word wrap",
			scope: "Diff",
			subtitle: diffWrapMode === "none" ? "Wrap long diff lines" : "Keep diff lines unwrapped",
			shortcut: "w",
			disabledReason: diffFullView ? null : "Open a diff first.",
			run: actions.toggleDiffWrapMode,
		}),
		defineCommand({
			id: "diff.toggle-whitespace",
			title: diffWhitespaceMode === "ignore" ? "Show whitespace changes" : "Ignore whitespace changes",
			scope: "Diff",
			subtitle: diffWhitespaceMode === "ignore" ? "Display the original GitHub patch" : "Hide whitespace-only line changes",
			disabledReason: diffFullView ? null : "Open a diff first.",
			keywords: ["whitespace", "spacing", "ignore", "show"],
			run: actions.toggleDiffWhitespaceMode,
		}),
		defineCommand({
			id: "diff.changed-files",
			title: "Open changed files navigator",
			scope: "Diff",
			subtitle: readyDiffFileCount > 0 ? `${readyDiffFileCount} changed files` : "No diff files loaded",
			shortcut: "f",
			disabledReason: changedFilesReason,
			keywords: ["files", "navigator", "search"],
			run: actions.openChangedFilesModal,
		}),
		defineCommand({
			id: "diff.next-file",
			title: "Next diff file",
			scope: "Diff",
			subtitle: readyDiffFileCount > 0 ? `${diffFileIndex + 1}/${readyDiffFileCount}` : "No diff files loaded",
			shortcut: "]",
			disabledReason: changedFilesReason,
			run: () => actions.jumpDiffFile(1),
		}),
		defineCommand({
			id: "diff.previous-file",
			title: "Previous diff file",
			scope: "Diff",
			subtitle: readyDiffFileCount > 0 ? `${diffFileIndex + 1}/${readyDiffFileCount}` : "No diff files loaded",
			shortcut: "[",
			disabledReason: changedFilesReason,
			run: () => actions.jumpDiffFile(-1),
		}),
		defineCommand({
			id: "diff.open-comment-target",
			title: selectedDiffCommentThreadCount > 0 ? "Open selected diff thread" : "Comment on selected diff line",
			scope: "Diff",
			subtitle: selectedDiffCommentAnchorLabel ?? "No diff line selected",
			shortcut: "enter",
			disabledReason: selectedDiffLineReason,
			keywords: ["review", "comment", "thread", "line"],
			run: actions.openSelectedDiffComment,
		}),
		defineCommand({
			id: "diff.toggle-range",
			title: diffRangeActive ? "Clear diff comment range" : "Start diff comment range",
			scope: "Diff",
			subtitle: selectedDiffCommentAnchorLabel ?? "No diff line selected",
			shortcut: "v",
			disabledReason: selectedDiffLineReason,
			keywords: ["review", "comment", "range", "visual"],
			run: actions.toggleDiffCommentRange,
		}),
		defineCommand({
			id: "diff.next-thread",
			title: "Next diff thread",
			scope: "Diff",
			subtitle: hasDiffCommentThreads ? "Jump to the next commented line" : "No diff comments loaded",
			shortcut: "n",
			disabledReason: diffThreadReason,
			keywords: ["review", "comment", "thread"],
			run: () => actions.moveDiffCommentThread(1),
		}),
		defineCommand({
			id: "diff.previous-thread",
			title: "Previous diff thread",
			scope: "Diff",
			subtitle: hasDiffCommentThreads ? "Jump to the previous commented line" : "No diff comments loaded",
			shortcut: "p",
			disabledReason: diffThreadReason,
			keywords: ["review", "comment", "thread"],
			run: () => actions.moveDiffCommentThread(-1),
		}),
		defineCommand({
			id: "diff.add-comment",
			title: "Add comment on selected diff line",
			scope: "Diff",
			subtitle: selectedDiffCommentAnchorLabel ?? "No diff line selected",
			disabledReason: selectedDiffLineReason,
			keywords: ["review", "reply"],
			run: actions.openDiffCommentModal,
		}),
		forSelected({
			id: "pull.submit-review",
			title: "Review pull request",
			scope: "Pull request",
			shortcut: "shift-r",
			requireOpen: true,
			keywords: ["review", "approve", "request changes", "comment"],
			run: () => actions.openSubmitReviewModal("APPROVE"),
		}),
		forSelected({
			id: "pull.toggle-draft",
			title: selectedPullRequest?.reviewStatus === "draft" ? "Mark ready for review" : "Convert to draft",
			scope: "Pull request",
			shortcut: "s",
			requireOpen: true,
			keywords: ["state", "ready"],
			run: actions.openPullRequestStateModal,
		}),
		defineCommand({
			id: "pull.labels",
			title: "Manage labels",
			scope: "Labels",
			subtitle: selectedItemLabel,
			shortcut: "l",
			disabledReason: noSelectedItemReason,
			run: actions.openLabelModal,
		}),
		forSelected({
			id: "pull.merge",
			title: "Merge pull request",
			scope: "Pull request",
			shortcut: "m",
			keywords: ["auto merge", "squash"],
			run: actions.openMergeModal,
		}),
		forSelected({
			id: "pull.close",
			title: "Close pull request",
			scope: "Pull request",
			shortcut: "x",
			requireOpen: true,
			run: actions.openCloseModal,
		}),
		forSelected({
			id: "pull.open-browser",
			title: "Open pull request in browser",
			scope: "Pull request",
			shortcut: "o",
			keywords: ["github", "web"],
			run: actions.openPullRequestInBrowser,
		}),
		forSelected({
			id: "pull.copy-metadata",
			title: "Copy pull request metadata",
			scope: "Pull request",
			shortcut: "y",
			keywords: ["clipboard", "url", "title"],
			run: actions.copyPullRequestMetadata,
		}),
		defineCommand({
			id: "issue.copy-metadata",
			title: "Copy issue metadata",
			scope: "Comments",
			subtitle: selectedIssueLabel,
			shortcut: "y",
			keywords: ["clipboard", "url", "title"],
			disabledReason: activeWorkspaceSurface === "issues" && selectedIssue ? null : "Select an issue first.",
			run: actions.copyIssueMetadata,
		}),
		defineCommand({
			id: "issue.close",
			title: "Close issue",
			scope: "Issue",
			subtitle: selectedIssueLabel,
			shortcut: "x",
			keywords: ["close", "resolve"],
			disabledReason: activeWorkspaceSurface === "issues" && selectedIssue ? null : "Select an issue first.",
			run: actions.openCloseModal,
		}),
		defineCommand({
			id: "app.quit",
			title: "Quit ghui",
			scope: "System",
			subtitle: "Leave the terminal UI",
			shortcut: "q",
			keywords: ["exit"],
			run: actions.quit,
		}),
	]
}
