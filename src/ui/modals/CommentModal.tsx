import { colors } from "../colors.js"
import { clampCursor, commentEditorSoftLines, type CommentEditorLine } from "../commentEditor.js"
import { fitCell, HintRow, PlainLine, standardModalDims, StandardModal, TextLine } from "../primitives.js"
import type { CommentModalState } from "./types.js"

export const CommentModal = ({
	state,
	anchorLabel,
	modalWidth,
	modalHeight,
	offsetLeft,
	offsetTop,
}: {
	state: CommentModalState
	anchorLabel: string
	modalWidth: number
	modalHeight: number
	offsetLeft: number
	offsetTop: number
}) => {
	const { contentWidth, bodyHeight } = standardModalDims(modalWidth, modalHeight)
	const title = state.target.kind === "edit" ? "Edit comment" : "Comment"
	const editorHeight = Math.max(1, bodyHeight - (state.error ? 1 : 0))
	const lineRanges = commentEditorSoftLines(state.body, contentWidth)
	const cursor = clampCursor(state.body, state.cursor)
	const cursorLineIndex = Math.max(
		0,
		lineRanges.findIndex((line, index) => cursor < line.end || index === lineRanges.length - 1),
	)
	const visibleStart = Math.min(Math.max(0, lineRanges.length - editorHeight), Math.max(0, cursorLineIndex - editorHeight + 1))
	const visibleLines = lineRanges.slice(visibleStart, visibleStart + editorHeight)
	const renderEditorLine = (line: CommentEditorLine, index: number) => {
		const lineIndex = visibleStart + index
		const isCursorLine = lineIndex === cursorLineIndex
		const cursorColumn = Math.max(0, Math.min(cursor - line.start, Math.max(0, contentWidth - 1), line.text.length))
		const visibleText = line.text

		if (!isCursorLine) {
			return <PlainLine key={lineIndex} text={fitCell(visibleText, contentWidth)} fg={state.body.length > 0 ? colors.text : colors.muted} />
		}

		const before = visibleText.slice(0, cursorColumn)
		const placeholder = state.body.length === 0 ? "Write a comment..." : ""
		const cursorChar = placeholder ? (placeholder[0] ?? " ") : (visibleText[cursorColumn] ?? " ")
		const after = placeholder ? placeholder.slice(1) : visibleText.slice(cursorColumn + 1)

		return (
			<TextLine key={lineIndex}>
				{before ? <span fg={colors.text}>{before}</span> : null}
				<span bg={colors.accent} fg={colors.background}>
					{cursorChar}
				</span>
				{after ? <span fg={placeholder ? colors.muted : colors.text}>{after}</span> : null}
			</TextLine>
		)
	}

	return (
		<StandardModal
			left={offsetLeft}
			top={offsetTop}
			width={modalWidth}
			height={modalHeight}
			title={title}
			headerRight={{ text: "enter save" }}
			subtitle={<PlainLine text={fitCell(anchorLabel, contentWidth)} fg={colors.muted} />}
			bodyPadding={1}
			footer={
				<HintRow
					items={[
						{ key: "enter", label: "save" },
						{ key: "shift-enter", label: "newline" },
						{ key: "esc", label: "cancel" },
					]}
				/>
			}
		>
			{state.error ? <PlainLine text={fitCell(state.error, contentWidth)} fg={colors.error} /> : null}
			{visibleLines.map(renderEditorLine)}
		</StandardModal>
	)
}
