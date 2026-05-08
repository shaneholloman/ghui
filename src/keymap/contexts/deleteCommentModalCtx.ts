import type { DeleteCommentModalCtx } from "../deleteCommentModal.ts"

export interface BuildDeleteCommentModalCtxInput {
	readonly closeActiveModal: () => void
	readonly confirmDeleteComment: () => void
}

export const buildDeleteCommentModalCtx = ({ closeActiveModal, confirmDeleteComment }: BuildDeleteCommentModalCtxInput): DeleteCommentModalCtx => ({
	closeModal: closeActiveModal,
	confirmDelete: confirmDeleteComment,
})
