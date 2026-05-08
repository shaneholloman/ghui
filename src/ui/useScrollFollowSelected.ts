import type { ScrollBoxRenderable } from "@opentui/core"
import { useEffect, type MutableRefObject } from "react"
import { scrollTopForVisibleLine } from "./diff.js"

const DEFAULT_STICKY_HEADER = 2

/**
 * Scrolls a scrollbox to keep the selected line visible whenever it
 * changes. Pass `null` for selectedLine to skip (e.g., when the list
 * is empty or no row is highlighted).
 */
export const useScrollFollowSelected = (
	scrollRef: MutableRefObject<ScrollBoxRenderable | null>,
	selectedLine: number | null,
	stickyHeader: number = DEFAULT_STICKY_HEADER,
): void => {
	useEffect(() => {
		const scroll = scrollRef.current
		if (!scroll || selectedLine === null) return
		const viewportHeight = scroll.viewport.height
		if (viewportHeight <= 0) return
		const nextTop = scrollTopForVisibleLine(scroll.scrollTop, viewportHeight, selectedLine, stickyHeader)
		if (nextTop !== scroll.scrollTop) scroll.scrollTo({ x: 0, y: nextTop })
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedLine])
}
