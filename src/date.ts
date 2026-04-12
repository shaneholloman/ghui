const DAY_MS = 24 * 60 * 60 * 1000

export const formatShortDate = (date: Date) =>
	date.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" })

export const formatTimestamp = (date: Date) =>
	date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()

export const daysOpen = (date: Date) => Math.max(0, Math.floor((Date.now() - date.getTime()) / DAY_MS))
