import { describe, expect, test } from "bun:test"
import { filterLabels } from "../src/ui/modals.js"

const labels = [
	{ name: "bug", color: "#ff0000" },
	{ name: "Enhancement", color: "#00ff00" },
	{ name: "good first issue", color: null },
	{ name: "chore", color: null },
]

describe("filterLabels", () => {
	test("empty query returns all labels unchanged", () => {
		expect(filterLabels(labels, "")).toBe(labels)
		expect(filterLabels(labels, "   ")).toBe(labels)
	})

	test("substring match is case-insensitive", () => {
		expect(filterLabels(labels, "ENH")).toEqual([{ name: "Enhancement", color: "#00ff00" }])
	})

	test("returns empty when nothing matches", () => {
		expect(filterLabels(labels, "xyz")).toEqual([])
	})

	test("trims whitespace from query", () => {
		expect(filterLabels(labels, "  bug  ")).toEqual([{ name: "bug", color: "#ff0000" }])
	})

	test("matches multi-word labels", () => {
		expect(filterLabels(labels, "first")).toEqual([{ name: "good first issue", color: null }])
	})
})
