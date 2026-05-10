import { TextAttributes, type ScrollBoxRenderable } from "@opentui/core"
import { useState, type RefObject } from "react"
import { daysOpen } from "../date.js"
import { colors, rowHoverBackground } from "./colors.js"
import { wrapText } from "./DetailsPane.js"
import { PaneDivider, PaneInsetLine, paneContentWidth } from "./paneLayout.js"
import { Filler, fitCell, MatchedCell, PlainLine, TextLine } from "./primitives.js"

export interface RepositoryListItem {
	readonly repository: string
	readonly pullRequestCount: number
	readonly issueCount: number
	readonly current: boolean
	readonly favorite: boolean
	readonly recent: boolean
	readonly lastActivityAt: Date | null
	readonly description: string | null
}

export const getRepoDetailJunctionRows = (repository: RepositoryListItem | null): readonly number[] => (repository ? [2, 4] : [])

const activityText = (date: Date | null) => (date ? `${daysOpen(date)}d` : "-")

export const RepoList = ({
	repositories,
	selectedIndex,
	contentWidth,
	filterText = "",
	showFilterBar = false,
	isFilterEditing = false,
	onSelectRepository,
}: {
	repositories: readonly RepositoryListItem[]
	selectedIndex: number
	contentWidth: number
	filterText?: string
	showFilterBar?: boolean
	isFilterEditing?: boolean
	onSelectRepository: (index: number) => void
}) => {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

	if (repositories.length === 0) {
		return (
			<box width={contentWidth} flexDirection="column">
				{showFilterBar ? (
					<TextLine>
						<span fg={colors.count}>/</span>
						<span fg={colors.muted}> </span>
						<span fg={isFilterEditing ? colors.text : colors.count}>{filterText.length > 0 ? filterText : "type to filter..."}</span>
					</TextLine>
				) : null}
				<PlainLine text={filterText.length > 0 ? "- No matching repositories." : "No repositories loaded yet"} fg={colors.muted} />
			</box>
		)
	}

	const ageWidth = Math.max(4, ...repositories.map((repo) => activityText(repo.lastActivityAt).length))
	const repoWidth = Math.max(12, contentWidth - 3 - ageWidth)

	return (
		<box width={contentWidth} flexDirection="column">
			{showFilterBar ? (
				<TextLine>
					<span fg={colors.count}>/</span>
					<span fg={colors.muted}> </span>
					<span fg={isFilterEditing ? colors.text : colors.count}>{filterText.length > 0 ? filterText : "type to filter..."}</span>
				</TextLine>
			) : null}
			{repositories.map((repo, index) => {
				const selected = index === selectedIndex
				const hovered = index === hoveredIndex
				const rowBg = selected ? colors.selectedBg : hovered ? rowHoverBackground() : undefined
				const marker = repo.current ? "›" : repo.favorite ? "★" : "·"
				const markerFg = repo.current ? colors.count : repo.favorite ? colors.accent : colors.muted
				const nameFg = repo.current ? colors.count : colors.text
				const age = activityText(repo.lastActivityAt)
				return (
					<box
						key={repo.repository}
						width={contentWidth}
						height={1}
						{...(rowBg ? { backgroundColor: rowBg } : {})}
						onMouseDown={() => onSelectRepository(index)}
						onMouseOver={() => setHoveredIndex(index)}
						onMouseOut={() => setHoveredIndex((current) => (current === index ? null : current))}
					>
						<TextLine
							width={contentWidth}
							bg={rowBg}
							onMouseDown={() => onSelectRepository(index)}
							onMouseOver={() => setHoveredIndex(index)}
							onMouseOut={() => setHoveredIndex((current) => (current === index ? null : current))}
						>
							<span fg={markerFg}>{marker}</span>
							<span> </span>
							<span fg={nameFg}>
								<MatchedCell text={repo.repository} width={repoWidth} query={filterText} />
							</span>
							<span fg={colors.muted}> </span>
							<span fg={colors.muted}>{fitCell(age, ageWidth, "right")}</span>
						</TextLine>
					</box>
				)
			})}
		</box>
	)
}

export const RepoDetailPane = ({
	repository,
	width,
	height,
	descriptionLineLimit = 1,
	descriptionScrollRef,
}: {
	repository: RepositoryListItem | null
	width: number
	height: number
	descriptionLineLimit?: number
	descriptionScrollRef?: RefObject<ScrollBoxRenderable | null>
}) => {
	const contentWidth = paneContentWidth(width)
	if (!repository) {
		return (
			<box width={width} height={height} flexDirection="column">
				<PaneInsetLine width={width}>
					<span fg={colors.muted}>No repository selected</span>
				</PaneInsetLine>
				<Filler rows={Math.max(0, height - 1)} prefix="repo-empty" />
			</box>
		)
	}

	const description = repository.description ?? "Open this repository to view pull requests and issues."
	const wrappedDescriptionLines = wrapText(description, contentWidth)
	const descriptionLines = descriptionScrollRef ? wrappedDescriptionLines : wrappedDescriptionLines.slice(0, descriptionLineLimit)
	const status = repository.current ? "current" : repository.favorite ? "favorite" : repository.recent ? "recent" : "repository"
	const activity = repository.lastActivityAt ? `${daysOpen(repository.lastActivityAt)}d ago` : "unknown"
	const fixedRows = 6
	const descriptionHeight = Math.max(1, height - fixedRows)
	return (
		<box width={width} height={height} flexDirection="column">
			<PaneInsetLine width={width}>
				<span fg={colors.text} attributes={TextAttributes.BOLD}>
					{fitCell(repository.repository, contentWidth)}
				</span>
			</PaneInsetLine>
			<PaneInsetLine width={width}>
				<span fg={repository.current || repository.favorite ? colors.accent : colors.count}>{status}</span>
				<span fg={colors.muted}> updated {activity}</span>
			</PaneInsetLine>
			<PaneDivider width={width} />
			<PaneInsetLine width={width}>
				<span fg={colors.muted}>known </span>
				<span fg={colors.count}>{repository.pullRequestCount}</span>
				<span fg={colors.muted}> PRs </span>
				<span fg={colors.count}>{repository.issueCount}</span>
				<span fg={colors.muted}> issues</span>
			</PaneInsetLine>
			<PaneDivider width={width} />
			<PaneInsetLine width={width}>
				<span fg={colors.count} attributes={TextAttributes.BOLD}>
					About
				</span>
			</PaneInsetLine>
			<scrollbox
				{...(descriptionScrollRef ? { ref: descriptionScrollRef } : {})}
				focusable={false}
				height={descriptionHeight}
				flexGrow={0}
				verticalScrollbarOptions={{ visible: descriptionLines.length > descriptionHeight }}
			>
				<box flexDirection="column">
					{descriptionLines.map((line, index) => (
						<PaneInsetLine key={index} width={width}>
							<span fg={colors.muted}>{fitCell(line, contentWidth)}</span>
						</PaneInsetLine>
					))}
				</box>
			</scrollbox>
		</box>
	)
}
