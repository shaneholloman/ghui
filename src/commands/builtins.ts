import { Effect } from "effect"
import * as Atom from "effect/unstable/reactivity/Atom"
import { filterDraftAtom, filterModeAtom, filterQueryAtom } from "../ui/filter/atoms.js"
import { activeModalAtom } from "../ui/modals/atoms.js"
import { initialCommandPaletteState, Modal } from "../ui/modals/types.js"
import { filterClearDisabledReasonAtom, filterTitleAtom } from "./derivations.js"
import { defineCommand, type CommandDefinition } from "./registry.js"

// The new-style command catalog. Categories are filled in during the Phase 1
// migration; see `plans/app-tsx-decomposition.md`.

export const globalCommands: readonly CommandDefinition[] = [
	defineCommand({
		id: "command.open",
		title: "Open command palette",
		scope: "Global",
		subtitle: "Search every available route through ghui",
		shortcut: "ctrl-p/cmd-k/?",
		keywords: ["palette", "commands", "deck", "help", "keys", "keyboard", "shortcuts"],
		run: Atom.set(activeModalAtom, Modal.CommandPalette(initialCommandPaletteState)),
	}),
	defineCommand({
		id: "filter.open",
		title: filterTitleAtom,
		scope: "Global",
		subtitle: "Search the visible surface",
		shortcut: "/",
		keywords: ["search"],
		run: Effect.gen(function* () {
			const query = yield* Atom.get(filterQueryAtom)
			yield* Atom.set(filterDraftAtom, query)
			yield* Atom.set(filterModeAtom, true)
		}),
	}),
	defineCommand({
		id: "filter.clear",
		title: "Clear filter",
		scope: "Global",
		subtitle: "Show every item in the current surface",
		shortcut: "esc",
		disabledReason: filterClearDisabledReasonAtom,
		run: Effect.gen(function* () {
			yield* Atom.set(filterQueryAtom, "")
			yield* Atom.set(filterDraftAtom, "")
			yield* Atom.set(filterModeAtom, false)
		}),
	}),
]
