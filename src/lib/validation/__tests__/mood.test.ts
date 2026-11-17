import { describe, expect, it } from "vitest";
import { ALLOWED_EMOTIONS, createMoodSchema } from "@/lib/validation/mood";

describe("validation/mood", () => {
    it("accepts valid mood, energy, focus, and allowed emotions", () => {
        for (const emotion of ALLOWED_EMOTIONS) {
            const parsed = createMoodSchema.parse({
                mood: 4,
                energy: 75,
                focus: 80,
                emotion,
            });
            expect(parsed.note).toBe("");
        }
    });

    it("rejects unsupported emotions or out-of-bounds slider values", () => {
        expect(
            createMoodSchema.safeParse({
                mood: 6,
                energy: 50,
                focus: 50,
                emotion: "normal",
            }).success
        ).toBe(false);
        expect(
            createMoodSchema.safeParse({
                mood: 3,
                energy: 101,
                focus: 50,
                emotion: "excited",
            }).success
        ).toBe(false);
        expect(
            createMoodSchema.safeParse({
                mood: 3,
                energy: 50,
                focus: 50,
                emotion: "furious",
            }).success
        ).toBe(false);
    });
});
