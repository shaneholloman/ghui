import type { CloseModalCtx } from "../closeModal.ts"

export interface BuildCloseModalCtxInput {
	readonly closeActiveModal: () => void
	readonly confirmClosePullRequest: () => void
}

export const buildCloseModalCtx = ({ closeActiveModal, confirmClosePullRequest }: BuildCloseModalCtxInput): CloseModalCtx => ({
	closeModal: closeActiveModal,
	confirmClose: confirmClosePullRequest,
})
