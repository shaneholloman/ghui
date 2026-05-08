import * as Atom from "effect/unstable/reactivity/Atom"
import type { PullRequestComment } from "../../domain.js"

export const commentsViewActiveAtom = Atom.make(false)
export const commentsViewSelectionAtom = Atom.make(0)
export const pullRequestCommentsAtom = Atom.make<Record<string, readonly PullRequestComment[]>>({}).pipe(Atom.keepAlive)
export const pullRequestCommentsLoadedAtom = Atom.make<Record<string, "loading" | "ready">>({}).pipe(Atom.keepAlive)
