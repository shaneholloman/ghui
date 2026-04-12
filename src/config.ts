export const DEFAULT_REPOS = ["anomalyco/opencode", "Effect-TS/effect-smol", "anomalyco/opencode-console"] as const

const splitCsv = (value: string | undefined): readonly string[] =>
	value
		?.split(",")
		.map((part) => part.trim())
		.filter((part) => part.length > 0) ?? DEFAULT_REPOS

const parsePositiveInt = (value: string | undefined, fallback: number) => {
	const parsed = Number.parseInt(value ?? "", 10)
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const config = {
	repos: splitCsv(process.env.GHUI_REPOS),
	author: process.env.GHUI_AUTHOR?.trim() || "@me",
	prFetchLimit: parsePositiveInt(process.env.GHUI_PR_FETCH_LIMIT, 200),
} as const
