import type { FilterModalCtx } from "../filterModal.ts"

export interface BuildFilterModalCtxInput {
	readonly closeActiveModal: () => void
	readonly applySelected: () => void
	readonly moveSelection: (delta: -1 | 1) => void
}

export const buildFilterModalCtx = ({ closeActiveModal, applySelected, moveSelection }: BuildFilterModalCtxInput): FilterModalCtx => ({
	closeModal: closeActiveModal,
	applySelected,
	moveSelection,
})
