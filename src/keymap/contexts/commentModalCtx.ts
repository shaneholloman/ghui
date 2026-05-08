import {
	backspace as editorBackspace,
	type CommentEditorValue,
	deleteForward as editorDeleteForward,
	deleteToLineEnd,
	deleteToLineStart,
	deleteWordBackward,
	deleteWordForward,
	insertText,
	moveLeft as editorMoveLeft,
	moveLineEnd,
	moveLineStart,
	moveRight as editorMoveRight,
	moveVertically,
	moveWordBackward,
	moveWordForward,
} from "../../ui/commentEditor.ts"
import type { CommentModalCtx } from "../commentModal.ts"

export interface BuildCommentModalCtxInput {
	readonly closeActiveModal: () => void
	readonly submitCommentModal: () => void
	readonly editComment: (transform: (state: CommentEditorValue) => CommentEditorValue) => void
}

export const buildCommentModalCtx = ({ closeActiveModal, submitCommentModal, editComment }: BuildCommentModalCtxInput): CommentModalCtx => ({
	closeModal: closeActiveModal,
	submit: submitCommentModal,
	insertNewline: () => editComment((state) => insertText(state, "\n")),
	moveLeft: () => editComment(editorMoveLeft),
	moveRight: () => editComment(editorMoveRight),
	moveUp: () => editComment((state) => moveVertically(state, -1)),
	moveDown: () => editComment((state) => moveVertically(state, 1)),
	moveLineStart: () => editComment(moveLineStart),
	moveLineEnd: () => editComment(moveLineEnd),
	moveWordBackward: () => editComment(moveWordBackward),
	moveWordForward: () => editComment(moveWordForward),
	backspace: () => editComment(editorBackspace),
	deleteForward: () => editComment(editorDeleteForward),
	deleteWordBackward: () => editComment(deleteWordBackward),
	deleteWordForward: () => editComment(deleteWordForward),
	deleteToLineStart: () => editComment(deleteToLineStart),
	deleteToLineEnd: () => editComment(deleteToLineEnd),
})
