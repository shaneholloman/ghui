import type { ScrollBoxRenderable } from "@opentui/core"
import type { ComponentProps, MutableRefObject } from "react"
import type { IssueItem } from "../domain.js"
import { DETAIL_BODY_SCROLL_LIMIT } from "../ui/DetailsPane.js"
import { IssueDetailPane, IssueList } from "../ui/IssueList.js"
import { SplitPane } from "../ui/paneLayout.js"
import { Divider } from "../ui/primitives.js"

export interface IssuesWorkspaceProps {
	readonly isWideLayout: boolean
	readonly wideBodyHeight: number
	readonly contentWidth: number
	readonly leftPaneWidth: number
	readonly rightPaneWidth: number
	readonly leftContentWidth: number
	readonly fullscreenContentWidth: number
	readonly sectionPadding: number
	readonly narrowIssueListHeight: number
	readonly narrowIssueDetailHeight: number
	readonly issueListNeedsScroll: boolean
	readonly narrowIssueListNeedsScroll: boolean
	readonly issueJunctions: readonly number[]
	readonly issueListProps: Omit<ComponentProps<typeof IssueList>, "contentWidth">
	readonly selectedIssue: IssueItem | null
	readonly issueListScrollRef: MutableRefObject<ScrollBoxRenderable | null>
	readonly detailPreviewScrollRef: MutableRefObject<ScrollBoxRenderable | null>
}

export const IssuesWorkspace = ({
	isWideLayout,
	wideBodyHeight,
	contentWidth,
	leftPaneWidth,
	rightPaneWidth,
	leftContentWidth,
	fullscreenContentWidth,
	sectionPadding,
	narrowIssueListHeight,
	narrowIssueDetailHeight,
	issueListNeedsScroll,
	narrowIssueListNeedsScroll,
	issueJunctions,
	issueListProps,
	selectedIssue,
	issueListScrollRef,
	detailPreviewScrollRef,
}: IssuesWorkspaceProps) => {
	if (isWideLayout) {
		return (
			<SplitPane
				key="wide-issues"
				height={wideBodyHeight}
				leftWidth={leftPaneWidth}
				rightWidth={rightPaneWidth}
				junctionRows={issueJunctions}
				left={
					issueListNeedsScroll ? (
						<scrollbox ref={issueListScrollRef} focusable={false} height={wideBodyHeight} flexGrow={0}>
							<box flexDirection="column" paddingLeft={sectionPadding}>
								<IssueList {...issueListProps} contentWidth={leftContentWidth} />
							</box>
						</scrollbox>
					) : (
						<box height={wideBodyHeight} flexDirection="column" paddingLeft={sectionPadding}>
							<IssueList {...issueListProps} contentWidth={leftContentWidth} />
						</box>
					)
				}
				right={<IssueDetailPane issue={selectedIssue} width={rightPaneWidth} height={wideBodyHeight} />}
			/>
		)
	}

	return (
		<box key="narrow-issues" height={wideBodyHeight} flexDirection="column">
			{narrowIssueListNeedsScroll ? (
				<scrollbox ref={issueListScrollRef} focusable={false} height={narrowIssueListHeight} flexGrow={0}>
					<box flexDirection="column" paddingLeft={sectionPadding} paddingRight={sectionPadding}>
						<IssueList {...issueListProps} contentWidth={fullscreenContentWidth} />
					</box>
				</scrollbox>
			) : (
				<box height={narrowIssueListHeight} flexDirection="column" paddingLeft={sectionPadding} paddingRight={sectionPadding}>
					<IssueList {...issueListProps} contentWidth={fullscreenContentWidth} />
				</box>
			)}
			<Divider width={contentWidth} />
			<scrollbox ref={detailPreviewScrollRef} focusable={false} height={narrowIssueDetailHeight} flexGrow={0}>
				<IssueDetailPane issue={selectedIssue} width={contentWidth} height={narrowIssueDetailHeight} bodyLineLimit={DETAIL_BODY_SCROLL_LIMIT} />
			</scrollbox>
		</box>
	)
}
