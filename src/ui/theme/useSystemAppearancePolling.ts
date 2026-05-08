import type { MutableRefObject } from "react"
import { useEffect } from "react"
import { detectSystemAppearance } from "../../systemAppearance.js"
import { resolveThemeId, type ThemeConfig } from "../../themeConfig.js"
import type { ThemeId, ThemeTone } from "../colors.js"

const POLL_INTERVAL_MS = 1000

export interface UseSystemAppearancePollingInput {
	readonly enabled: boolean
	readonly systemAppearanceRef: MutableRefObject<ThemeTone>
	readonly themeConfigRef: MutableRefObject<ThemeConfig>
	readonly setSystemAppearance: (appearance: ThemeTone) => void
	readonly previewActiveTheme: (id: ThemeId) => void
}

export const useSystemAppearancePolling = ({ enabled, systemAppearanceRef, themeConfigRef, setSystemAppearance, previewActiveTheme }: UseSystemAppearancePollingInput): void => {
	useEffect(() => {
		if (!enabled) return
		let cancelled = false
		const refresh = () => {
			void detectSystemAppearance().then((appearance) => {
				if (cancelled || appearance === systemAppearanceRef.current) return
				systemAppearanceRef.current = appearance
				setSystemAppearance(appearance)
				previewActiveTheme(resolveThemeId(themeConfigRef.current, appearance))
			})
		}
		const interval = globalThis.setInterval(refresh, POLL_INTERVAL_MS)
		refresh()
		return () => {
			cancelled = true
			globalThis.clearInterval(interval)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [enabled])
}
