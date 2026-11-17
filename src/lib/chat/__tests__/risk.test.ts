import { describe, expect, it } from "vitest";
import { detectCrisisRisk } from "@/lib/chat/risk";

describe("lib/chat/risk crisis detector", () => {
    it("detects explicit English and Vietnamese self-harm or crisis phrases", () => {
        expect(detectCrisisRisk("Sometimes I think about suicide")).toBe(true);
        expect(detectCrisisRisk("I just want to die right now")).toBe(true);
        expect(detectCrisisRisk("Tôi cảm thấy bế tắc và muốn chết")).toBe(true);
        expect(detectCrisisRisk("Mình từng nghĩ đến tự tử vì áp lực")).toBe(true);
    });

    it("avoids false positives on harmless substrings and routine study stress", () => {
        expect(detectCrisisRisk("")).toBe(false);
        expect(detectCrisisRisk("   ")).toBe(false);
        expect(detectCrisisRisk("My diet plan and study schedule for finals")).toBe(false);
        expect(detectCrisisRisk("I am stressed about tomorrow's exam deadline")).toBe(false);
    });
});
