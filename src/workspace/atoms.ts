import * as Atom from "effect/unstable/reactivity/Atom"
import type { WorkspaceSurface } from "../workspaceSurfaces.js"

export const workspaceSurfaceAtom = Atom.make<WorkspaceSurface>("pullRequests")
export const selectedRepositoryIndexAtom = Atom.make(0)
export const favoriteRepositoriesAtom = Atom.make<Record<string, true>>({}).pipe(Atom.keepAlive)
