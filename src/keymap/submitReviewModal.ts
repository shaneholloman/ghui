import { context } from "@ghui/keymap"

export interface SubmitReviewModalCtx {
	readonly closeModal: () => void
	readonly submit: () => void
	readonly insertNewline: () => void
	readonly moveActionSelection: (delta: -1 | 1) => void
	readonly moveLeft: () => void
	readonly moveRight: () => void
	readonly moveUp: () => void
	readonly moveDown: () => void
	readonly moveLineStart: () => void
	readonly moveLineEnd: () => void
	readonly moveWordBackward: () => void
	readonly moveWordForward: () => void
	readonly backspace: () => void
	readonly deleteForward: () => void
	readonly deleteWordBackward: () => void
	readonly deleteWordForward: () => void
	readonly deleteToLineStart: () => void
	readonly deleteToLineEnd: () => void
}

const SubmitReview = context<SubmitReviewModalCtx>()

export const submitReviewModalKeymap = SubmitReview(
	{ id: "submit-review.escape", title: "Cancel", keys: ["escape"], run: (s) => s.closeModal() },
	{ id: "submit-review.submit", title: "Submit", keys: ["ctrl+s", "return"], run: (s) => s.submit() },
	{ id: "submit-review.newline", title: "Insert newline", keys: ["shift+return"], run: (s) => s.insertNewline() },
	{ id: "submit-review.next-action", title: "Next action", keys: ["tab"], run: (s) => s.moveActionSelection(1) },
	{ id: "submit-review.previous-action", title: "Previous action", keys: ["shift+tab"], run: (s) => s.moveActionSelection(-1) },

	{ id: "submit-review.move-left", title: "Cursor left", keys: ["left", "ctrl+b"], run: (s) => s.moveLeft() },
	{ id: "submit-review.move-right", title: "Cursor right", keys: ["right", "ctrl+f"], run: (s) => s.moveRight() },
	{ id: "submit-review.move-up", title: "Cursor up", keys: ["up"], run: (s) => s.moveUp() },
	{ id: "submit-review.move-down", title: "Cursor down", keys: ["down"], run: (s) => s.moveDown() },
	{ id: "submit-review.line-start", title: "Line start", keys: ["home", "ctrl+a"], run: (s) => s.moveLineStart() },
	{ id: "submit-review.line-end", title: "Line end", keys: ["end", "ctrl+e"], run: (s) => s.moveLineEnd() },
	{ id: "submit-review.word-back", title: "Word backward", keys: ["meta+b", "meta+left"], run: (s) => s.moveWordBackward() },
	{ id: "submit-review.word-forward", title: "Word forward", keys: ["meta+f", "meta+right"], run: (s) => s.moveWordForward() },

	{ id: "submit-review.backspace", title: "Backspace", keys: ["backspace"], run: (s) => s.backspace() },
	{ id: "submit-review.delete", title: "Delete", keys: ["delete", "ctrl+d"], run: (s) => s.deleteForward() },
	{ id: "submit-review.delete-word-back", title: "Delete word backward", keys: ["ctrl+w", "meta+backspace"], run: (s) => s.deleteWordBackward() },
	{ id: "submit-review.delete-word-forward", title: "Delete word forward", keys: ["meta+delete"], run: (s) => s.deleteWordForward() },
	{ id: "submit-review.delete-to-line-start", title: "Delete to line start", keys: ["ctrl+u"], run: (s) => s.deleteToLineStart() },
	{ id: "submit-review.delete-to-line-end", title: "Delete to line end", keys: ["ctrl+k"], run: (s) => s.deleteToLineEnd() },
)
