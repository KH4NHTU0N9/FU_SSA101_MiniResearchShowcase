import { describe, expect, it } from "vitest";
import { createAssessmentSchema } from "@/lib/validation/assessment";

describe("validation/assessment", () => {
    it("accepts integer DASS-21 raw subscale scores in [0, 21]", () => {
        expect(
            createAssessmentSchema.safeParse({
                scores: { Depression: 0, Anxiety: 14, Stress: 21 },
            }).success
        ).toBe(true);
    });

    it("rejects out-of-range, negative, or non-integer scores", () => {
        expect(
            createAssessmentSchema.safeParse({
                scores: { Depression: -1, Anxiety: 5, Stress: 5 },
            }).success
        ).toBe(false);
        expect(
            createAssessmentSchema.safeParse({
                scores: { Depression: 22, Anxiety: 5, Stress: 5 },
            }).success
        ).toBe(false);
        expect(
            createAssessmentSchema.safeParse({
                scores: { Depression: 5.5, Anxiety: 5, Stress: 5 },
            }).success
        ).toBe(false);
    });
});
