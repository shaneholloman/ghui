import * as Atom from "effect/unstable/reactivity/Atom"

export const filterQueryAtom = Atom.make("")
export const filterDraftAtom = Atom.make("")
export const filterModeAtom = Atom.make(false)
