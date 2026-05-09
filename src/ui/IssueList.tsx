import { TextAttributes } from "@opentui/core"
import { useMemo, useState, type ReactNode } from "react"
import { daysOpen, formatRelativeDate } from "../date.js"
import type { IssueItem, LoadStatus } from "../domain.js"
import { colors, rowHoverBackground } from "./colors.js"
import { CommentSegments } from "./comments.js"
import { bodyPreview, wrapText } from "./DetailsPane.js"
import { LabelChips, labelChipRows } from "./LabelChips.js"
import { PaneDivider, PaneInsetLine, paneContentWidth } from "./paneLayout.js"
import { Filler, fitCell, MatchedCell, PlainLine, TextLine } from "./primitives.js"
import { groupBy, repoColor } from "./pullRequests.js"

const getRowLayout = (contentWidth: number, numberWidth: number, ageWidth: number) => {
	const fixedWidth = numberWidth + 1 + ageWidth
	const titleWidth = Math.max(8, contentWidth - fixedWidth)
	return { numberWidth, titleWidth, ageWidth }
}

const GROUP_ICON = "◆"

const IssueDetailLine = ({ children, width }: { children: ReactNode; width: number }) => <PaneInsetLine width={width}>{children}</PaneInsetLine>

const issueGroups = (issues: readonly IssueItem[], showRepositoryGroups: boolean) => {
	const indexed = issues.map((issue, index) => ({ issue, index }))
	return showRepositoryGroups ? groupBy(indexed, ({ issue }) => issue.repository) : ([[null, indexed]] as const)
}

export const IssueList = ({
	issues,
	selectedIndex,
	status,
	error,
	repository,
	contentWidth,
	filterText = "",
	showFilterBar = false,
	isFilterEditing = false,
	onSelectIssue,
}: {
	issues: readonly IssueItem[]
	selectedIndex: number
	status: LoadStatus
	error: string | null
	repository: string | null
	contentWidth: number
	filterText?: string
	showFilterBar?: boolean
	isFilterEditing?: boolean
	onSelectIssue: (index: number) => void
}) => {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
	const numberWidth = Math.max(4, ...issues.map((issue) => `#${issue.number}`.length))
	const ageWidth = Math.max(4, ...issues.map((issue) => `${daysOpen(issue.createdAt)}d`.length + 1))
	const { titleWidth } = getRowLayout(contentWidth, numberWidth, ageWidth)
	const groups = issueGroups(issues, repository === null)

	return (
		<box width={contentWidth} flexDirection="column">
			{showFilterBar ? (
				<TextLine>
					<span fg={colors.count}>/</span>
					<span fg={colors.muted}> </span>
					<span fg={isFilterEditing ? colors.text : colors.count}>{filterText.length > 0 ? filterText : "type to filter..."}</span>
				</TextLine>
			) : null}
			{status === "ready" && repository === null && issues.length === 0 ? (
				<PlainLine text={filterText.length > 0 ? "- No matching issues." : "- No issues in your repositories."} fg={colors.muted} />
			) : null}
			{status === "loading" && issues.length === 0 ? <PlainLine text="- Loading issues..." fg={colors.muted} /> : null}
			{status === "error" ? <PlainLine text={`- ${error ?? "Could not load issues."}`} fg={colors.error} /> : null}
			{status === "ready" && repository && issues.length === 0 ? (
				<PlainLine text={filterText.length > 0 ? "- No matching issues." : "- No open issues."} fg={colors.muted} />
			) : null}
			{groups.flatMap(([groupRepository, groupIssues]) => {
				const rows: ReactNode[] = []
				if (groupRepository) {
					rows.push(
						<TextLine key={`group-${groupRepository}`} width={contentWidth}>
							<span fg={repoColor(groupRepository)}>{GROUP_ICON} </span>
							<span fg={repoColor(groupRepository)} attributes={TextAttributes.BOLD}>
								<MatchedCell text={groupRepository} width={contentWidth - 2} query={filterText} />
							</span>
						</TextLine>,
					)
				}
				for (const { issue, index } of groupIssues) {
					const selected = index === selectedIndex
					const hovered = index === hoveredIndex
					const rowBg = selected ? colors.selectedBg : hovered ? rowHoverBackground() : undefined
					const ageText = `${daysOpen(issue.createdAt)}d`
					rows.push(
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
							<MatchedCell text={issue.title} width={titleWidth} query={filterText} />
							<span fg={colors.muted}>{fitCell(ageText, ageWidth, "right")}</span>
						</TextLine>,
					)
				}
				return rows
			})}
		</box>
	)
}

export const getIssueDetailJunctionRows = (issue: IssueItem | null, paneWidth: number): readonly number[] => {
	if (!issue) return []
	const contentWidth = paneContentWidth(paneWidth)
	const titleLines = wrapText(issue.title, Math.max(1, contentWidth)).length
	const labelRows = labelChipRows(issue.labels, contentWidth).length
	return [titleLines + 1 + labelRows]
}

export const IssueDetailPane = ({ issue, width, height, bodyLineLimit }: { issue: IssueItem | null; width: number; height: number; bodyLineLimit?: number }) => {
	const contentWidth = paneContentWidth(width)
	const titleLines = issue ? wrapText(issue.title, Math.max(1, contentWidth)) : []
	const labelRows = issue ? labelChipRows(issue.labels, contentWidth) : []
	const resolvedBodyLineLimit = bodyLineLimit ?? Math.max(1, height - titleLines.length - labelRows.length - 2)
	const visibleBodyLines = useMemo(
		() => bodyPreview(issue?.body ?? "", contentWidth, resolvedBodyLineLimit, { tableMode: "truncate" }),
		[issue?.body, contentWidth, resolvedBodyLineLimit],
	)
	if (!issue) {
		return (
			<box width={width} height={height} flexDirection="column">
				<IssueDetailLine width={width}>
					<span fg={colors.muted}>No issue selected</span>
				</IssueDetailLine>
				<Filler rows={Math.max(0, height - 1)} prefix="issue-empty" />
			</box>
		)
	}

	const commentsText = issue.commentCount > 0 ? `${issue.commentCount} ${issue.commentCount === 1 ? "comment" : "comments"}` : null
	const metaLeft = `#${issue.number} by ${issue.author} · ${formatRelativeDate(issue.createdAt)}`
	const commentsGap = commentsText ? Math.max(2, contentWidth - metaLeft.length - commentsText.length) : 0
	const usedRows = titleLines.length + 1 + labelRows.length + 1 + visibleBodyLines.length
	const contentHeight = Math.max(height, usedRows)

	return (
		<box width={width} height={contentHeight} flexDirection="column">
			{titleLines.map((line, index) => (
				<IssueDetailLine key={`title-${index}`} width={width}>
					<span fg={colors.text} attributes={TextAttributes.BOLD}>
						{fitCell(line, contentWidth)}
					</span>
				</IssueDetailLine>
			))}
			<IssueDetailLine width={width}>
				<span fg={colors.count}>#{issue.number}</span>
				<span fg={colors.muted}> by </span>
				<span fg={colors.count}>{issue.author}</span>
				<span fg={colors.muted}> · {formatRelativeDate(issue.createdAt)}</span>
				{commentsText ? <span fg={colors.muted}>{" ".repeat(commentsGap)}</span> : null}
				{commentsText ? <span fg={colors.muted}>{commentsText}</span> : null}
			</IssueDetailLine>
			{labelRows.map((row, index) => (
				<IssueDetailLine key={`labels-${index}`} width={width}>
					<LabelChips labels={row} />
				</IssueDetailLine>
			))}
			<PaneDivider width={width} />
			{visibleBodyLines.map((line, index) => (
				<IssueDetailLine key={index} width={width}>
					<CommentSegments segments={line.segments} />
				</IssueDetailLine>
			))}
			<Filler rows={Math.max(0, contentHeight - usedRows)} prefix="issue-detail" />
		</box>
	)
}
