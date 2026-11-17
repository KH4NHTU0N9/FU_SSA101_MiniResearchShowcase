import { describe, expect, it } from "vitest";
import { containsProhibitedContent } from "@/lib/community/moderation";

describe("security/moderation-boundaries", () => {
    it("blocks English and Vietnamese profanity at standalone boundaries", () => {
        const blocked = [
            "kill yourself",
            "you are STUPID!",
            "Đồ ngu quá",
            "tôi muốn giết người",
            "fuck this exam",
        ];
        for (const phrase of blocked) {
            expect(containsProhibitedContent(phrase), phrase).toBe(true);
        }
    });

    it("avoids false positives when blocked substrings appear inside benign words", () => {
        const allowed = [
            "",
            "Taking the DASS-21 assessment before midterms",
            "My study class starts at 08:00 AM",
            "Skill mastery takes consistent daily effort",
            "Reviewing classic algorithms and passion projects",
        ];
        for (const clean of allowed) {
            expect(containsProhibitedContent(clean), clean).toBe(false);
        }
    });
});
