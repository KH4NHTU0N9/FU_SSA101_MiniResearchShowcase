import { describe, expect, it } from "vitest";
import { containsProhibitedContent } from "@/lib/community/moderation";

describe("lib/community/moderation", () => {
    it("flags prohibited words at whole-word or phrase boundaries case-insensitively", () => {
        expect(containsProhibitedContent("You are so STUPID!")).toBe(true);
        expect(containsProhibitedContent("Stop being mean, idiot, hate this")).toBe(true);
        expect(containsProhibitedContent("Đừng nói những lời ngu vậy")).toBe(true);
    });

    it("does NOT trigger Scunthorpe false positives on normal academic words", () => {
        expect(containsProhibitedContent("")).toBe(false);
        expect(containsProhibitedContent("Finished my psychology assessment and class notes")).toBe(
            false
        );
        expect(containsProhibitedContent("I studied computer science assignment today")).toBe(
            false
        );
        expect(containsProhibitedContent("Passing my Calculus exam made me happy")).toBe(false);
    });
});
