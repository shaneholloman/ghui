import { TextAttributes } from "@opentui/core"
import { useState } from "react"
import { colors, rowHoverBackground } from "./colors.js"
import { fitCell, TextLine } from "./primitives.js"
import { workspaceSurfaceLabels, workspaceSurfaces, type WorkspaceSurface } from "../workspaceSurfaces.js"

export const WorkspaceTabs = ({ activeSurface, width, onSelect }: { activeSurface: WorkspaceSurface; width: number; onSelect: (surface: WorkspaceSurface) => void }) => {
	const [hoveredSurface, setHoveredSurface] = useState<WorkspaceSurface | null>(null)
	const rendered = workspaceSurfaces
		.map((surface) => {
			const active = surface === activeSurface
			const label = workspaceSurfaceLabels[surface]
			return { surface, active, text: ` ${label} ` }
		})
		.flatMap((tab, index) => (index === 0 ? [tab] : [{ surface: tab.surface, active: false, text: "  " }, tab]))
	const textWidth = rendered.reduce((sum, tab) => sum + tab.text.length, 0)
	const filler = Math.max(0, width - textWidth)

	return (
		<box width={width} height={1} flexDirection="row">
			{rendered.map((tab, index) => (
				<box
					key={`${tab.surface}-${index}`}
					width={tab.text.length}
					height={1}
					{...(tab.text.trim().length > 0
						? {
								onMouseDown: () => onSelect(tab.surface),
								onMouseOver: () => setHoveredSurface(tab.surface),
								onMouseOut: () => setHoveredSurface((current) => (current === tab.surface ? null : current)),
							}
						: {})}
				>
					<text
						wrapMode="none"
						truncate
						fg={tab.active ? colors.accent : colors.muted}
						{...(hoveredSurface === tab.surface && !tab.active ? { bg: rowHoverBackground() } : {})}
						attributes={tab.active ? TextAttributes.BOLD : 0}
					>
						{tab.text}
					</text>
				</box>
			))}
			{filler > 0 ? <TextLine width={filler}>{fitCell("", filler)}</TextLine> : null}
		</box>
	)
}

export const IssuesPlaceholder = ({ width, height, repository }: { width: number; height: number; repository: string | null }) => {
	const rowWidth = Math.max(1, width - 2)
	const context = repository ? repository : "No repository selected"
	const fillerRows = Math.max(0, height - 8)

	return (
		<box width={width} height={height} flexDirection="column" paddingLeft={1} paddingRight={1}>
			<TextLine width={rowWidth}>
				<span fg={colors.accent} attributes={TextAttributes.BOLD}>
					ISSUES
				</span>
			</TextLine>
			<TextLine width={rowWidth}>
				<span fg={colors.muted}>Project </span>
				<span fg={colors.text}>{context}</span>
			</TextLine>
			<box height={1} />
			<TextLine width={rowWidth}>
				<span fg={colors.text}>Issue list/detail will live here.</span>
			</TextLine>
			<TextLine width={rowWidth}>
				<span fg={colors.muted}>This keeps the new workspace shell visible while PRs stay fully usable.</span>
			</TextLine>
			<box height={1} />
			<TextLine width={rowWidth}>
				<span fg={colors.count}>1</span>
				<span fg={colors.muted}> pull requests </span>
				<span fg={colors.count}>2</span>
				<span fg={colors.muted}> issues </span>
				<span fg={colors.count}>tab</span>
				<span fg={colors.muted}> switch surface</span>
			</TextLine>
			{Array.from({ length: fillerRows }, (_, index) => (
				<box key={index} height={1} />
			))}
		</box>
	)
}
