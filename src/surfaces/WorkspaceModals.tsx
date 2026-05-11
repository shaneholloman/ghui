import type { AppCommand } from "../commands.js"
import type { PullRequestLabel, PullRequestReviewComment } from "../domain.js"
import { CommandPalette } from "../ui/CommandPalette.js"
import {
	ChangedFilesModal,
	type ChangedFilesModalState,
	type ChangedFileSearchResult,
	CloseModal,
	type CloseModalState,
	type CommandPaletteState,
	CommentModal,
	type CommentModalState,
	CommentThreadModal,
	type CommentThreadModalState,
	DeleteCommentModal,
	type DeleteCommentModalState,
	FilterModal,
	type FilterModalState,
	LabelModal,
	type LabelModalState,
	MergeModal,
	type MergeModalState,
	OpenRepositoryModal,
	type OpenRepositoryModalState,
	PullRequestStateModal,
	type PullRequestStateModalState,
	SubmitReviewModal,
	type SubmitReviewModalState,
	ThemeModal,
	type ThemeModalState,
} from "../ui/modals.js"

export interface ModalLayout {
	readonly width: number
	readonly height: number
	readonly left: number
	readonly top: number
}

export interface WorkspaceModalsProps {
	readonly loadingIndicator: string
	readonly selectedItemLabels: readonly PullRequestLabel[]
	readonly commentAnchorLabel: string
	readonly selectedDiffCommentThread: readonly PullRequestReviewComment[]
	readonly changedFileResults: readonly ChangedFileSearchResult[]
	readonly readyDiffFileCount: number
	readonly commandPaletteCommands: readonly AppCommand[]
	readonly selectedCommandIndex: number
	readonly onSelectCommandIndex: (index: number) => void
	readonly onRunCommand: (command: AppCommand) => void

	readonly labelModalActive: boolean
	readonly closeModalActive: boolean
	readonly pullRequestStateModalActive: boolean
	readonly commentModalActive: boolean
	readonly deleteCommentModalActive: boolean
	readonly commentThreadModalActive: boolean
	readonly changedFilesModalActive: boolean
	readonly filterModalActive: boolean
	readonly submitReviewModalActive: boolean
	readonly mergeModalActive: boolean
	readonly themeModalActive: boolean
	readonly openRepositoryModalActive: boolean
	readonly commandPaletteActive: boolean

	readonly labelModal: LabelModalState
	readonly closeModal: CloseModalState
	readonly pullRequestStateModal: PullRequestStateModalState
	readonly commentModal: CommentModalState
	readonly deleteCommentModal: DeleteCommentModalState
	readonly commentThreadModal: CommentThreadModalState
	readonly changedFilesModal: ChangedFilesModalState
	readonly filterModal: FilterModalState
	readonly submitReviewModal: SubmitReviewModalState
	readonly mergeModal: MergeModalState
	readonly themeModal: ThemeModalState
	readonly openRepositoryModal: OpenRepositoryModalState
	readonly commandPalette: CommandPaletteState

	readonly labelLayout: ModalLayout
	readonly closeLayout: ModalLayout
	readonly pullRequestStateLayout: ModalLayout
	readonly commentLayout: ModalLayout
	readonly deleteCommentLayout: ModalLayout
	readonly commentThreadLayout: ModalLayout
	readonly changedFilesLayout: ModalLayout
	readonly filterLayout: ModalLayout
	readonly submitReviewLayout: ModalLayout
	readonly mergeLayout: ModalLayout
	readonly themeLayout: ModalLayout
	readonly openRepositoryLayout: ModalLayout
	readonly commandPaletteLayout: ModalLayout
}

export const WorkspaceModals = (props: WorkspaceModalsProps) => (
	<>
		{props.labelModalActive ? (
			<LabelModal
				state={props.labelModal}
				currentLabels={props.selectedItemLabels}
				modalWidth={props.labelLayout.width}
				modalHeight={props.labelLayout.height}
				offsetLeft={props.labelLayout.left}
				offsetTop={props.labelLayout.top}
				loadingIndicator={props.loadingIndicator}
			/>
		) : null}
		{props.closeModalActive ? (
			<CloseModal
				state={props.closeModal}
				modalWidth={props.closeLayout.width}
				modalHeight={props.closeLayout.height}
				offsetLeft={props.closeLayout.left}
				offsetTop={props.closeLayout.top}
				loadingIndicator={props.loadingIndicator}
			/>
		) : null}
		{props.pullRequestStateModalActive ? (
			<PullRequestStateModal
				state={props.pullRequestStateModal}
				modalWidth={props.pullRequestStateLayout.width}
				modalHeight={props.pullRequestStateLayout.height}
				offsetLeft={props.pullRequestStateLayout.left}
				offsetTop={props.pullRequestStateLayout.top}
				loadingIndicator={props.loadingIndicator}
			/>
		) : null}
		{props.commentModalActive ? (
			<CommentModal
				state={props.commentModal}
				anchorLabel={props.commentAnchorLabel}
				modalWidth={props.commentLayout.width}
				modalHeight={props.commentLayout.height}
				offsetLeft={props.commentLayout.left}
				offsetTop={props.commentLayout.top}
			/>
		) : null}
		{props.deleteCommentModalActive ? (
			<DeleteCommentModal
				state={props.deleteCommentModal}
				modalWidth={props.deleteCommentLayout.width}
				modalHeight={props.deleteCommentLayout.height}
				offsetLeft={props.deleteCommentLayout.left}
				offsetTop={props.deleteCommentLayout.top}
				loadingIndicator={props.loadingIndicator}
			/>
		) : null}
		{props.commentThreadModalActive ? (
			<CommentThreadModal
				state={props.commentThreadModal}
				anchorLabel={props.commentAnchorLabel}
				comments={props.selectedDiffCommentThread}
				modalWidth={props.commentThreadLayout.width}
				modalHeight={props.commentThreadLayout.height}
				offsetLeft={props.commentThreadLayout.left}
				offsetTop={props.commentThreadLayout.top}
			/>
		) : null}
		{props.changedFilesModalActive ? (
			<ChangedFilesModal
				state={props.changedFilesModal}
				results={props.changedFileResults}
				totalCount={props.readyDiffFileCount}
				modalWidth={props.changedFilesLayout.width}
				modalHeight={props.changedFilesLayout.height}
				offsetLeft={props.changedFilesLayout.left}
				offsetTop={props.changedFilesLayout.top}
			/>
		) : null}
		{props.filterModalActive ? (
			<FilterModal
				state={props.filterModal}
				modalWidth={props.filterLayout.width}
				modalHeight={props.filterLayout.height}
				offsetLeft={props.filterLayout.left}
				offsetTop={props.filterLayout.top}
			/>
		) : null}
		{props.submitReviewModalActive ? (
			<SubmitReviewModal
				state={props.submitReviewModal}
				modalWidth={props.submitReviewLayout.width}
				modalHeight={props.submitReviewLayout.height}
				offsetLeft={props.submitReviewLayout.left}
				offsetTop={props.submitReviewLayout.top}
			/>
		) : null}
		{props.mergeModalActive ? (
			<MergeModal
				state={props.mergeModal}
				modalWidth={props.mergeLayout.width}
				modalHeight={props.mergeLayout.height}
				offsetLeft={props.mergeLayout.left}
				offsetTop={props.mergeLayout.top}
				loadingIndicator={props.loadingIndicator}
			/>
		) : null}
		{props.themeModalActive ? (
			<ThemeModal
				state={props.themeModal}
				modalWidth={props.themeLayout.width}
				modalHeight={props.themeLayout.height}
				offsetLeft={props.themeLayout.left}
				offsetTop={props.themeLayout.top}
			/>
		) : null}
		{props.openRepositoryModalActive ? (
			<OpenRepositoryModal
				state={props.openRepositoryModal}
				modalWidth={props.openRepositoryLayout.width}
				modalHeight={props.openRepositoryLayout.height}
				offsetLeft={props.openRepositoryLayout.left}
				offsetTop={props.openRepositoryLayout.top}
			/>
		) : null}
		{props.commandPaletteActive ? (
			<CommandPalette
				commands={props.commandPaletteCommands}
				query={props.commandPalette.query}
				selectedIndex={props.selectedCommandIndex}
				modalWidth={props.commandPaletteLayout.width}
				modalHeight={props.commandPaletteLayout.height}
				offsetLeft={props.commandPaletteLayout.left}
				offsetTop={props.commandPaletteLayout.top}
				onSelectCommandIndex={props.onSelectCommandIndex}
				onRunCommand={props.onRunCommand}
			/>
		) : null}
	</>
)
