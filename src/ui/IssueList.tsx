import { TextAttributes } from "@opentui/core"
import { useState } from "react"
import { daysOpen, formatRelativeDate } from "../date.js"
import type { IssueItem, LoadStatus } from "../domain.js"
import { colors, rowHoverBackground } from "./colors.js"
import { Divider, Filler, fitCell, MatchedCell, PlainLine, TextLine } from "./primitives.js"

const labelText = (issue: IssueItem) => issue.labels.map((label) => label.name).join(", ")

const wrapText = (text: string, width: number): readonly string[] => {
	if (width <= 0) return [""]
	return text.split("\n").flatMap((paragraph) => {
		const words = paragraph.trim().split(/\s+/).filter(Boolean)
		if (words.length === 0) return [""]
		const lines: string[] = []
		let current = ""
		for (const word of words) {
			const next = current ? `${current} ${word}` : word
			if (next.length > width && current) {
				lines.push(current)
				current = word
			} else {
				current = next
			}
		}
		if (current) lines.push(current)
		return lines
	})
}

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

export const ISSUE_DETAIL_DIVIDER_ROW = 3

export const IssueDetailPane = ({ issue, width, height }: { issue: IssueItem | null; width: number; height: number }) => {
	const contentWidth = Math.max(1, width - 2)
	if (!issue) {
		return (
			<box width={width} height={height} flexDirection="column" paddingLeft={1} paddingRight={1}>
				<PlainLine text="No issue selected" fg={colors.muted} />
				<Filler rows={Math.max(0, height - 1)} prefix="issue-empty" />
			</box>
		)
	}

	const labelSummary = labelText(issue) || "no labels"
	const bodyLines = wrapText(issue.body || "No description provided.", contentWidth)
	const visibleBodyLines = bodyLines.slice(0, Math.max(1, height - 8))
	const usedRows = 5 + visibleBodyLines.length

	return (
		<box width={width} height={height} flexDirection="column" paddingLeft={1} paddingRight={1}>
			<TextLine width={contentWidth}>
				<span fg={colors.count}>#{issue.number}</span>
				<span> </span>
				<span fg={colors.text} attributes={TextAttributes.BOLD}>
					{fitCell(issue.title, Math.max(1, contentWidth - String(issue.number).length - 2))}
				</span>
			</TextLine>
			<TextLine width={contentWidth}>
				<span fg={colors.muted}>opened {formatRelativeDate(issue.createdAt)} by </span>
				<span fg={colors.count}>{issue.author}</span>
			</TextLine>
			<TextLine width={contentWidth}>
				<span fg={colors.muted}>{fitCell(`${labelSummary} · ${issue.commentCount} comments`, contentWidth)}</span>
			</TextLine>
			<Divider width={contentWidth} />
			{visibleBodyLines.map((line, index) => (
				<PlainLine key={index} text={fitCell(line, contentWidth)} fg={line.length === 0 ? colors.muted : colors.text} />
			))}
			<Filler rows={Math.max(0, height - usedRows)} prefix="issue-detail" />
		</box>
	)
}
