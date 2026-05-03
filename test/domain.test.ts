import { describe, expect, test } from "bun:test"
import { pullRequestQueueSearchQualifier } from "../src/domain.js"
import { viewCacheKey } from "../src/pullRequestViews.js"

describe("pullRequestQueueSearchQualifier", () => {
	test("repository mode with repository → repo: qualifier", () => {
		expect(pullRequestQueueSearchQualifier("repository", "owner/name")).toBe("repo:owner/name")
	})

	test("repository mode without repository falls back to @me", () => {
		expect(pullRequestQueueSearchQualifier("repository", null)).toBe("author:@me")
	})

	test("authored mode → author:@me", () => {
		expect(pullRequestQueueSearchQualifier("authored", null)).toBe("author:@me")
	})

	test("review mode → review-requested:@me regardless of repository", () => {
		expect(pullRequestQueueSearchQualifier("review", "owner/name")).toBe("review-requested:@me")
	})

	test("assigned mode → assignee:@me", () => {
		expect(pullRequestQueueSearchQualifier("assigned", null)).toBe("assignee:@me")
	})

	test("mentioned mode → mentions:@me", () => {
		expect(pullRequestQueueSearchQualifier("mentioned", null)).toBe("mentions:@me")
	})
})

describe("viewCacheKey", () => {
	test("repository view key includes repo path", () => {
		expect(viewCacheKey({ _tag: "Repository", repository: "owner/name" })).toBe("repository:owner/name")
	})

	test("queue view key is the mode literal", () => {
		expect(viewCacheKey({ _tag: "Queue", mode: "authored", repository: null })).toBe("authored")
		expect(viewCacheKey({ _tag: "Queue", mode: "review", repository: "owner/name" })).toBe("review")
	})
})
