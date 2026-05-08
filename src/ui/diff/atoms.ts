import { Effect } from "effect"
import * as Atom from "effect/unstable/reactivity/Atom"
import type { DiffCommentSide, PullRequestReviewComment } from "../../domain.js"
import { loadStoredDiffWhitespaceMode } from "../../themeStore.js"
import type { DiffView, DiffWhitespaceMode, DiffWrapMode } from "../diff.js"

export const initialDiffWhitespaceMode = await Effect.runPromise(loadStoredDiffWhitespaceMode)

export const diffFullViewAtom = Atom.make(false)
export const diffFileIndexAtom = Atom.make(0)
export const diffScrollTopAtom = Atom.make(0)
export const diffRenderViewAtom = Atom.make<DiffView>("split")
export const diffWrapModeAtom = Atom.make<DiffWrapMode>("none")
export const diffWhitespaceModeAtom = Atom.make<DiffWhitespaceMode>(initialDiffWhitespaceMode)
export const diffCommentAnchorIndexAtom = Atom.make(0)
export const diffPreferredSideAtom = Atom.make<DiffCommentSide | null>(null)
export const diffCommentRangeStartIndexAtom = Atom.make<number | null>(null)
export const diffCommentThreadsAtom = Atom.make<Record<string, readonly PullRequestReviewComment[]>>({}).pipe(Atom.keepAlive)
export const diffCommentsLoadedAtom = Atom.make<Record<string, "loading" | "ready">>({}).pipe(Atom.keepAlive)
