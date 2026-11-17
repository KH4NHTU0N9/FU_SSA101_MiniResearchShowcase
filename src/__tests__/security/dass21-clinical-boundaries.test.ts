import { describe, expect, it } from "vitest";
import {
    DASS_THRESHOLDS,
    MAX_DASS21_SUBSCALE_SCORE,
    calculateDass21Scores,
    getDass21Severity,
    isHighRiskAssessment,
    questions,
} from "@/lib/assessment-data";

describe("security/dass21-clinical-boundaries", () => {
    it("verifies exact Lovibond & Lovibond (1995) boundary cutoffs for Depression, Anxiety, and Stress", () => {
        const cases = [
            { cat: "Depression" as const, score: 4, expected: "Normal" },
            { cat: "Depression" as const, score: 5, expected: "Mild" },
            { cat: "Depression" as const, score: 6, expected: "Mild" },
            { cat: "Depression" as const, score: 7, expected: "Moderate" },
            { cat: "Depression" as const, score: 10, expected: "Moderate" },
            { cat: "Depression" as const, score: 11, expected: "Severe" },
            { cat: "Depression" as const, score: 13, expected: "Severe" },
            { cat: "Depression" as const, score: 14, expected: "Extremely Severe" },
            { cat: "Anxiety" as const, score: 3, expected: "Normal" },
            { cat: "Anxiety" as const, score: 4, expected: "Mild" },
            { cat: "Anxiety" as const, score: 6, expected: "Moderate" },
            { cat: "Anxiety" as const, score: 8, expected: "Severe" },
            { cat: "Anxiety" as const, score: 10, expected: "Extremely Severe" },
            { cat: "Stress" as const, score: 7, expected: "Normal" },
            { cat: "Stress" as const, score: 8, expected: "Mild" },
            { cat: "Stress" as const, score: 10, expected: "Moderate" },
            { cat: "Stress" as const, score: 13, expected: "Severe" },
            { cat: "Stress" as const, score: 17, expected: "Extremely Severe" },
        ];

        for (const c of cases) {
            expect(getDass21Severity(c.cat, c.score).label, `${c.cat}:${c.score}`).toBe(
                c.expected
            );
        }
        expect(DASS_THRESHOLDS.Depression.normal).toBe(4);
    });

    it("clamps out-of-range raw item scores and triggers high-risk alert only at Severe+", () => {
        const maxAnswers = Object.fromEntries(questions.map((q) => [q.id, 99]));
        const clampedMax = calculateDass21Scores(maxAnswers);
        expect(clampedMax).toEqual({
            Depression: MAX_DASS21_SUBSCALE_SCORE,
            Anxiety: MAX_DASS21_SUBSCALE_SCORE,
            Stress: MAX_DASS21_SUBSCALE_SCORE,
        });

        expect(isHighRiskAssessment({ Depression: 10, Anxiety: 7, Stress: 12 })).toBe(false);
        expect(isHighRiskAssessment({ Depression: 11, Anxiety: 0, Stress: 0 })).toBe(true);
        expect(isHighRiskAssessment({ Depression: 0, Anxiety: 8, Stress: 0 })).toBe(true);
        expect(isHighRiskAssessment({ Depression: 0, Anxiety: 0, Stress: 13 })).toBe(true);
    });
});
