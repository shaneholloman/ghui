import { context } from "@ghui/keymap"

export interface DeleteCommentModalCtx {
	readonly closeModal: () => void
	readonly confirmDelete: () => void
}

const DeleteComment = context<DeleteCommentModalCtx>()

export const deleteCommentModalKeymap = DeleteComment(
	{ id: "delete-comment-modal.cancel", title: "Cancel", keys: ["escape"], run: (s) => s.closeModal() },
	{ id: "delete-comment-modal.confirm", title: "Delete comment", keys: ["return"], run: (s) => s.confirmDelete() },
)
