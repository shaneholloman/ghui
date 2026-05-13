// Handoff slot for "quit ghui". The OpenTUI renderer is React-component-bound
// (via useRenderer), so its `.destroy()` method can't flow through an atom.
// App.tsx installs the implementation on mount; the `app.quit` command body
// requests it inside Effect.sync.

let quitImpl: (() => void) | null = null

export const setQuitImpl = (fn: (() => void) | null) => {
	quitImpl = fn
}

export const requestQuit = () => {
	quitImpl?.()
}
