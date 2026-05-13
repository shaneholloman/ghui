// Handoff slot between the diff-location-preservation React hook (which has
// access to the scrollbox renderable ref) and command Effects (which want
// to fire-and-forget "preserve current location" before mutating a diff
// setting). The hook installs its imperative preserve function on mount;
// command bodies call `requestPreserveDiffLocation()` inside an
// `Effect.sync` *before* the atom write that triggers the diff re-render.
//
// This is a deliberate side-channel — not a deep module — because the
// imperative scrollbox ref can't be observed through an atom: preserve has
// to read `scroll.scrollTop` synchronously *before* React commits the new
// view mode, and atoms only let us subscribe to changes after render.

let preserveImpl: (() => void) | null = null

export const setDiffLocationPreserver = (fn: (() => void) | null) => {
	preserveImpl = fn
}

export const requestPreserveDiffLocation = () => {
	preserveImpl?.()
}
