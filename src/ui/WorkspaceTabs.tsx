import { TextAttributes } from "@opentui/core"
import { colors } from "./colors.js"
import { fitCell, TextLine } from "./primitives.js"
import { workspaceSurfaceLabels, workspaceSurfaces, type WorkspaceSurface } from "../workspaceSurfaces.js"

export const WorkspaceTabs = ({ activeSurface, width }: { activeSurface: WorkspaceSurface; width: number }) => {
	const rendered = workspaceSurfaces
		.map((surface, index) => {
			const active = surface === activeSurface
			const label = `${index + 1} ${workspaceSurfaceLabels[surface]}`
			return { surface, active, text: active ? `[${label}]` : ` ${label} ` }
		})
		.flatMap((tab, index) => (index === 0 ? [tab] : [{ surface: tab.surface, active: false, text: "  " }, tab]))
	const textWidth = rendered.reduce((sum, tab) => sum + tab.text.length, 0)
	const filler = Math.max(0, width - textWidth)

	return (
		<TextLine width={width}>
			{rendered.map((tab, index) => (
				<span key={`${tab.surface}-${index}`} fg={tab.active ? colors.accent : colors.muted} attributes={tab.active ? TextAttributes.BOLD : 0}>
					{tab.text}
				</span>
			))}
			{filler > 0 ? <span>{fitCell("", filler)}</span> : null}
		</TextLine>
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
