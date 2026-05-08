import type { LabelModalCtx } from "../labelModal.ts"

export interface BuildLabelModalCtxInput {
	readonly closeActiveModal: () => void
	readonly toggleLabelAtIndex: () => void
	readonly moveLabelSelection: (delta: -1 | 1) => void
}

export const buildLabelModalCtx = ({ closeActiveModal, toggleLabelAtIndex, moveLabelSelection }: BuildLabelModalCtxInput): LabelModalCtx => ({
	closeModal: closeActiveModal,
	toggleSelected: toggleLabelAtIndex,
	moveSelection: moveLabelSelection,
})
