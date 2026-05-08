import type { OpenRepositoryModalCtx } from "../openRepositoryModal.ts"

export interface BuildOpenRepositoryModalCtxInput {
	readonly closeActiveModal: () => void
	readonly openRepositoryFromInput: () => void
}

export const buildOpenRepositoryModalCtx = ({ closeActiveModal, openRepositoryFromInput }: BuildOpenRepositoryModalCtxInput): OpenRepositoryModalCtx => ({
	closeModal: closeActiveModal,
	openFromInput: openRepositoryFromInput,
})
