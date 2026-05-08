import { TextAttributes } from "@opentui/core"
import { useState } from "react"
import { daysOpen } from "../date.js"
import type { IssueItem, LoadStatus } from "../domain.js"
import { colors, rowHoverBackground } from "./colors.js"
import { fitCell, MatchedCell, PlainLine, SectionTitle, TextLine } from "./primitives.js"

const labelText = (issue: IssueItem) => issue.labels.map((label) => label.name).join(", ")

const getRowLayout = (contentWidth: number, numberWidth: number, ageWidth: number) => {
	const fixedWidth = numberWidth + 1 + ageWidth
	const labelWidth = Math.min(18, Math.max(0, Math.floor(contentWidth * 0.22)))
	const titleWidth = Math.max(8, contentWidth - fixedWidth - labelWidth)
	return { numberWidth, titleWidth, labelWidth, ageWidth }
}

export const IssueList = ({
	issues,
	selectedIndex,
	status,
	error,
	repository,
	contentWidth,
	onSelectIssue,
}: {
	issues: readonly IssueItem[]
	selectedIndex: number
	status: LoadStatus
	error: string | null
	repository: string | null
	contentWidth: number
	onSelectIssue: (index: number) => void
}) => {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
	const numberWidth = Math.max(4, ...issues.map((issue) => `#${issue.number}`.length))
	const ageWidth = Math.max(4, ...issues.map((issue) => `${daysOpen(issue.createdAt)}d`.length + 1))
	const { titleWidth, labelWidth } = getRowLayout(contentWidth, numberWidth, ageWidth)

	return (
		<box width={contentWidth} flexDirection="column">
			<SectionTitle title="ISSUES" />
			{repository ? null : <PlainLine text="- Open a repository to list issues." fg={colors.muted} />}
			{status === "loading" && repository ? <PlainLine text="- Loading issues..." fg={colors.muted} /> : null}
			{status === "error" ? <PlainLine text={`- ${error ?? "Could not load issues."}`} fg={colors.error} /> : null}
			{status === "ready" && repository && issues.length === 0 ? <PlainLine text="- No open issues." fg={colors.muted} /> : null}
			{issues.map((issue, index) => {
				const selected = index === selectedIndex
				const hovered = index === hoveredIndex
				const rowBg = selected ? colors.selectedBg : hovered ? rowHoverBackground() : undefined
				const ageText = `${daysOpen(issue.createdAt)}d`
				return (
					<TextLine
						key={issue.url}
						width={contentWidth}
						fg={selected ? colors.selectedText : colors.text}
						bg={rowBg}
						onMouseDown={() => onSelectIssue(index)}
						onMouseOver={() => setHoveredIndex(index)}
						onMouseOut={() => setHoveredIndex((current) => (current === index ? null : current))}
					>
						<span fg={selected ? colors.accent : colors.count} attributes={selected ? TextAttributes.BOLD : 0}>
							{fitCell(`#${issue.number}`, numberWidth, "right")}
						</span>
						<span> </span>
						<MatchedCell text={issue.title} width={titleWidth} query="" />
						{labelWidth > 0 ? <span fg={colors.muted}>{fitCell(labelText(issue), labelWidth)}</span> : null}
						<span fg={colors.muted}>{fitCell(ageText, ageWidth, "right")}</span>
					</TextLine>
				)
			})}
		</box>
	)
}
