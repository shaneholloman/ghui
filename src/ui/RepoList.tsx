import { TextAttributes } from "@opentui/core"
import { daysOpen } from "../date.js"
import { colors } from "./colors.js"
import { wrapText } from "./DetailsPane.js"
import { Filler, fitCell, MatchedCell, PlainLine, TextLine, trimCell } from "./primitives.js"

export interface RepositoryListItem {
	readonly repository: string
	readonly pullRequestCount: number
	readonly issueCount: number
	readonly favorite: boolean
	readonly recent: boolean
	readonly lastActivityAt: Date | null
	readonly description: string | null
}

const countText = (item: RepositoryListItem) => `${item.pullRequestCount} PRs ${item.issueCount} iss`

export const RepoList = ({
	repositories,
	selectedIndex,
	contentWidth,
	onSelectRepository,
}: {
	repositories: readonly RepositoryListItem[]
	selectedIndex: number
	contentWidth: number
	onSelectRepository: (index: number) => void
}) => {
	if (repositories.length === 0) {
		return (
			<box width={contentWidth} flexDirection="column">
				<PlainLine text="No repositories loaded yet" fg={colors.muted} />
			</box>
		)
	}

	const countWidth = Math.max(10, ...repositories.map((repo) => countText(repo).length))
	const ageWidth = Math.max(5, ...repositories.map((repo) => (repo.lastActivityAt ? `${daysOpen(repo.lastActivityAt)}d` : "").length + 1))
	const repoWidth = Math.max(12, contentWidth - 2 - countWidth - ageWidth)

	return (
		<box width={contentWidth} flexDirection="column">
			{repositories.map((repo, index) => {
				const selected = index === selectedIndex
				const marker = repo.favorite ? "★" : repo.recent ? "›" : " "
				const age = repo.lastActivityAt ? `${daysOpen(repo.lastActivityAt)}d` : ""
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
							<MatchedCell text={repo.repository} width={repoWidth} query="" />
							<span fg={colors.muted}>{fitCell(countText(repo), countWidth)}</span>
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
}: {
	repository: RepositoryListItem | null
	width: number
	height: number
	descriptionLineLimit?: number
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

	const description = repository.description ?? "Open this repository to view its pull requests and issues."
	const descriptionLines = wrapText(description, contentWidth).slice(0, descriptionLineLimit)
	const usedRows = 5 + descriptionLines.length
	const contentHeight = Math.max(height, usedRows)
	return (
		<box width={width} height={contentHeight} flexDirection="column" paddingLeft={1} paddingRight={1}>
			<TextLine width={contentWidth}>
				<span fg={colors.text} attributes={TextAttributes.BOLD}>
					{fitCell(repository.repository, contentWidth)}
				</span>
			</TextLine>
			<TextLine width={contentWidth}>
				<span fg={repository.favorite ? colors.accent : colors.muted}>{repository.favorite ? "favorite" : repository.recent ? "recent" : "repository"}</span>
			</TextLine>
			<box height={1} />
			<TextLine width={contentWidth}>
				<span fg={colors.count}>{repository.pullRequestCount}</span>
				<span fg={colors.muted}> pull requests </span>
				<span fg={colors.count}>{repository.issueCount}</span>
				<span fg={colors.muted}> issues</span>
			</TextLine>
			<box height={1} />
			{descriptionLines.map((line, index) => (
				<PlainLine key={index} text={trimCell(line, contentWidth)} fg={colors.muted} />
			))}
			<Filler rows={Math.max(0, contentHeight - usedRows)} prefix="repo-detail" />
		</box>
	)
}
