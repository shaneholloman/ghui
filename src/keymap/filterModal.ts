import { context } from "@ghui/keymap"

export interface FilterModalCtx {
	readonly closeModal: () => void
	readonly applySelected: () => void
	readonly moveSelection: (delta: -1 | 1) => void
}

const Filter = context<FilterModalCtx>()

export const filterModalKeymap = Filter(
	{ id: "filter-modal.close", title: "Close", keys: ["escape"], run: (s) => s.closeModal() },
	{ id: "filter-modal.apply", title: "Apply filter", keys: ["return"], run: (s) => s.applySelected() },
	{ id: "filter-modal.up", title: "Up", keys: ["k", "up", "ctrl+p", "ctrl+k"], run: (s) => s.moveSelection(-1) },
	{ id: "filter-modal.down", title: "Down", keys: ["j", "down", "ctrl+n", "ctrl+j"], run: (s) => s.moveSelection(1) },
)
