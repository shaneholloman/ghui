import type { AppCtx } from "../all.ts"
import { buildChangedFilesModalCtx, type BuildChangedFilesModalCtxInput } from "./changedFilesModalCtx.ts"
import { buildCloseModalCtx, type BuildCloseModalCtxInput } from "./closeModalCtx.ts"
import { buildCommandPaletteCtx, type BuildCommandPaletteCtxInput } from "./commandPaletteCtx.ts"
import { buildCommentModalCtx, type BuildCommentModalCtxInput } from "./commentModalCtx.ts"
import { buildCommentsViewCtx, type BuildCommentsViewCtxInput } from "./commentsViewCtx.ts"
import { buildCommentThreadModalCtx, type BuildCommentThreadModalCtxInput } from "./commentThreadModalCtx.ts"
import { buildDeleteCommentModalCtx, type BuildDeleteCommentModalCtxInput } from "./deleteCommentModalCtx.ts"
import { buildDetailViewCtx, type BuildDetailViewCtxInput } from "./detailViewCtx.ts"
import { buildDiffViewCtx, type BuildDiffViewCtxInput } from "./diffViewCtx.ts"
import { buildFilterModeCtx, type BuildFilterModeCtxInput } from "./filterModeCtx.ts"
import { buildLabelModalCtx, type BuildLabelModalCtxInput } from "./labelModalCtx.ts"
import { buildListNavCtx, type BuildListNavCtxInput } from "./listNavCtx.ts"
import { buildMergeModalCtx, type BuildMergeModalCtxInput } from "./mergeModalCtx.ts"
import { buildOpenRepositoryModalCtx, type BuildOpenRepositoryModalCtxInput } from "./openRepositoryModalCtx.ts"
import { buildPullRequestStateModalCtx, type BuildPullRequestStateModalCtxInput } from "./pullRequestStateModalCtx.ts"
import { buildSubmitReviewModalCtx, type BuildSubmitReviewModalCtxInput } from "./submitReviewModalCtx.ts"
import { buildThemeModalCtx, type BuildThemeModalCtxInput } from "./themeModalCtx.ts"

export interface BuildAppCtxFlags {
	readonly closeModalActive: boolean
	readonly pullRequestStateModalActive: boolean
	readonly mergeModalActive: boolean
	readonly commentThreadModalActive: boolean
	readonly changedFilesModalActive: boolean
	readonly submitReviewModalActive: boolean
	readonly labelModalActive: boolean
	readonly themeModalActive: boolean
	readonly openRepositoryModalActive: boolean
	readonly commentModalActive: boolean
	readonly deleteCommentModalActive: boolean
	readonly commandPaletteActive: boolean
	readonly filterMode: boolean
	readonly diffFullView: boolean
	readonly detailFullView: boolean
	readonly commentsViewActive: boolean
	readonly textInputActive: boolean
}

export interface BuildAppCtxInput {
	readonly flags: BuildAppCtxFlags
	readonly closeModal: BuildCloseModalCtxInput
	readonly pullRequestStateModal: BuildPullRequestStateModalCtxInput
	readonly mergeModal: BuildMergeModalCtxInput
	readonly commentThreadModal: BuildCommentThreadModalCtxInput
	readonly changedFilesModal: BuildChangedFilesModalCtxInput
	readonly submitReviewModal: BuildSubmitReviewModalCtxInput
	readonly labelModal: BuildLabelModalCtxInput
	readonly themeModal: BuildThemeModalCtxInput
	readonly openRepositoryModal: BuildOpenRepositoryModalCtxInput
	readonly commentModal: BuildCommentModalCtxInput
	readonly deleteCommentModal: BuildDeleteCommentModalCtxInput
	readonly commandPalette: BuildCommandPaletteCtxInput
	readonly filterModeCtx: BuildFilterModeCtxInput
	readonly diff: BuildDiffViewCtxInput
	readonly detail: BuildDetailViewCtxInput
	readonly commentsView: BuildCommentsViewCtxInput
	readonly listNav: BuildListNavCtxInput
	readonly openCommandPalette: () => void
	readonly handleQuitOrClose: () => void
}

export const buildAppCtx = (input: BuildAppCtxInput): AppCtx => ({
	...input.flags,
	closeModal: buildCloseModalCtx(input.closeModal),
	pullRequestStateModal: buildPullRequestStateModalCtx(input.pullRequestStateModal),
	mergeModal: buildMergeModalCtx(input.mergeModal),
	commentThreadModal: buildCommentThreadModalCtx(input.commentThreadModal),
	changedFilesModal: buildChangedFilesModalCtx(input.changedFilesModal),
	submitReviewModal: buildSubmitReviewModalCtx(input.submitReviewModal),
	labelModal: buildLabelModalCtx(input.labelModal),
	themeModal: buildThemeModalCtx(input.themeModal),
	openRepositoryModal: buildOpenRepositoryModalCtx(input.openRepositoryModal),
	commentModal: buildCommentModalCtx(input.commentModal),
	deleteCommentModal: buildDeleteCommentModalCtx(input.deleteCommentModal),
	commandPalette: buildCommandPaletteCtx(input.commandPalette),
	filterModeCtx: buildFilterModeCtx(input.filterModeCtx),
	diff: buildDiffViewCtx(input.diff),
	detail: buildDetailViewCtx(input.detail),
	commentsView: buildCommentsViewCtx(input.commentsView),
	listNav: buildListNavCtx(input.listNav),
	openCommandPalette: input.openCommandPalette,
	handleQuitOrClose: input.handleQuitOrClose,
})
