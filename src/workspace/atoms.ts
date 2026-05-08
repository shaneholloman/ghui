import * as Atom from "effect/unstable/reactivity/Atom"
import { CacheService } from "../services/CacheService.js"
import { githubRuntime } from "../services/runtime.js"
import type { ViewerId, WorkspacePreferences } from "../workspacePreferences.js"
import type { WorkspaceSurface } from "../workspaceSurfaces.js"

export const workspaceSurfaceAtom = Atom.make<WorkspaceSurface>("pullRequests")
export const selectedRepositoryIndexAtom = Atom.make(0)
export const favoriteRepositoriesAtom = Atom.make<Record<string, true>>({}).pipe(Atom.keepAlive)

export const readWorkspacePreferencesAtom = githubRuntime.fn<ViewerId>()((viewer) => CacheService.use((cache) => cache.readWorkspacePreferences(viewer)))
export const writeWorkspacePreferencesAtom = githubRuntime.fn<WorkspacePreferences>()((preferences) => CacheService.use((cache) => cache.writeWorkspacePreferences(preferences)))
