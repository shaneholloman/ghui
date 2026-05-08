import * as Atom from "effect/unstable/reactivity/Atom"
import { initialModal, type Modal } from "../modals.js"

export const activeModalAtom = Atom.make<Modal>(initialModal)
