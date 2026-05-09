import { TextAttributes, type ScrollBoxRenderable } from "@opentui/core"
import type { RefObject } from "react"
import { daysOpen } from "../date.js"
import { colors } from "./colors.js"
import { wrapText } from "./DetailsPane.js"
import { Filler, fitCell, MatchedCell, PlainLine, TextLine } from "./primitives.js"

export interface RepositoryListItem {
	readonly repository: string
	readonly pullRequestCount: number
	readonly issueCount: number
	readonly favorite: boolean
	readonly recent: boolean
	readonly lastActivityAt: Date | null
	readonly description: string | null
}

const plural = (count: number, singular: string, pluralText = `${singular}s`) => `${count} ${count === 1 ? singular : pluralText}`
const pullRequestText = (item: RepositoryListItem) => plural(item.pullRequestCount, "PR")
const issueText = (item: RepositoryListItem) => plural(item.issueCount, "iss")
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

	const prWidth = Math.max(5, ...repositories.map((repo) => pullRequestText(repo).length))
	const issueWidth = Math.max(5, ...repositories.map((repo) => issueText(repo).length))
	const ageWidth = Math.max(4, ...repositories.map((repo) => activityText(repo.lastActivityAt).length))
	const repoWidth = Math.max(12, contentWidth - 2 - prWidth - 1 - issueWidth - 1 - ageWidth)

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
				const marker = repo.favorite ? "★" : repo.recent ? "›" : " "
				const age = activityText(repo.lastActivityAt)
				return (
					<box
						key={repo.repository}
						height={1}
						{...(selected ? { backgroundColor: colors.selectedBg } : {})}
						onMouseDown={() => onSelectRepository(index)}
						onMouseOver={() => onSelectRepository(index)}
					>
						<TextLine bg={selected ? colors.selectedBg : undefined}>
							<span fg={repo.favorite ? colors.accent : colors.muted}>{marker}</span>
							<span> </span>
							<MatchedCell text={repo.repository} width={repoWidth} query={filterText} />
							<span fg={colors.muted}>{fitCell(pullRequestText(repo), prWidth, "right")}</span>
							<span fg={colors.muted}> </span>
							<span fg={colors.muted}>{fitCell(issueText(repo), issueWidth, "right")}</span>
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
	const contentWidth = Math.max(1, width - 2)
	if (!repository) {
		return (
			<box width={width} height={height} flexDirection="column" paddingLeft={1} paddingRight={1}>
				<PlainLine text="No repository selected" fg={colors.muted} />
				<Filler rows={Math.max(0, height - 1)} prefix="repo-empty" />
			</box>
		)
	}

	const description = repository.description ?? "Open this repository to view pull requests and issues."
	const wrappedDescriptionLines = wrapText(description, contentWidth)
	const descriptionLines = descriptionScrollRef ? wrappedDescriptionLines : wrappedDescriptionLines.slice(0, descriptionLineLimit)
	const status = repository.favorite ? "favorite" : repository.recent ? "recent" : "repository"
	const activity = repository.lastActivityAt ? `${daysOpen(repository.lastActivityAt)}d ago` : "unknown"
	const fixedRows = 6
	const descriptionHeight = Math.max(1, height - fixedRows)
	return (
		<box width={width} height={height} flexDirection="column" paddingLeft={1} paddingRight={1}>
			<TextLine width={contentWidth}>
				<span fg={colors.text} attributes={TextAttributes.BOLD}>
					{fitCell(repository.repository, contentWidth)}
				</span>
			</TextLine>
			<TextLine width={contentWidth}>
				<span fg={repository.favorite ? colors.accent : colors.count}>{status}</span>
				<span fg={colors.muted}> · updated {activity}</span>
			</TextLine>
			<box height={1} />
			<TextLine width={contentWidth}>
				<span fg={colors.count}>{fitCell(String(repository.pullRequestCount), 4, "right")}</span>
				<span fg={colors.muted}> pull requests</span>
			</TextLine>
			<TextLine width={contentWidth}>
				<span fg={colors.count}>{fitCell(String(repository.issueCount), 4, "right")}</span>
				<span fg={colors.muted}> issues</span>
			</TextLine>
			<box height={1} />
			<scrollbox
				{...(descriptionScrollRef ? { ref: descriptionScrollRef } : {})}
				focusable={false}
				height={descriptionHeight}
				flexGrow={0}
				verticalScrollbarOptions={{ visible: descriptionLines.length > descriptionHeight }}
			>
				<box flexDirection="column">
					{descriptionLines.map((line, index) => (
						<PlainLine key={index} text={fitCell(line, contentWidth)} fg={colors.muted} />
					))}
				</box>
			</scrollbox>
		</box>
	)
}
