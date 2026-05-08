export const workspaceSurfaces = ["pullRequests", "issues"] as const

export type WorkspaceSurface = (typeof workspaceSurfaces)[number]

export const workspaceSurfaceLabels: Record<WorkspaceSurface, string> = {
	pullRequests: "PULL REQUESTS",
	issues: "ISSUES",
}

export const nextWorkspaceSurface = (surface: WorkspaceSurface, delta: 1 | -1): WorkspaceSurface => {
	const index = workspaceSurfaces.indexOf(surface)
	const next = (index + delta + workspaceSurfaces.length) % workspaceSurfaces.length
	return workspaceSurfaces[next]!
}
