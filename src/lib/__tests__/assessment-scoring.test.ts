import { describe, expect, it } from "vitest";
import {
    calculateDass21Scores,
    getDass21Severity,
    isHighRiskAssessment,
    questions,
} from "@/lib/assessment-data";

describe("lib/assessment-data scoring and severity tiers", () => {
    it("aggregates clamped 0..3 item scores by DASS-21 subscale", () => {
        const answers: Record<number, number> = {};
        for (const q of questions) {
            answers[q.id] = q.category === "Depression" ? 5 : q.category === "Anxiety" ? 2 : -1;
        }
        // Depression clamped to 3 * 7 = 21; Anxiety = 2 * 7 = 14; Stress clamped to 0 * 7 = 0
        expect(calculateDass21Scores(answers)).toEqual({
            Depression: 21,
            Anxiety: 14,
            Stress: 0,
        });
    });

    it("classifies severity thresholds accurately per subscale", () => {
        expect(getDass21Severity("Depression", 4).label).toBe("Normal");
        expect(getDass21Severity("Depression", 5).label).toBe("Mild");
        expect(getDass21Severity("Depression", 10).label).toBe("Moderate");
        expect(getDass21Severity("Depression", 13).label).toBe("Severe");
        expect(getDass21Severity("Depression", 14).label).toBe("Extremely Severe");

        expect(getDass21Severity("Anxiety", 3).label).toBe("Normal");
        expect(getDass21Severity("Anxiety", 8).label).toBe("Severe");
        expect(getDass21Severity("Stress", 16).label).toBe("Severe");
        expect(getDass21Severity("Stress", 17).label).toBe("Extremely Severe");
    });

    it("flags high-risk assessments when any subscale reaches Severe or Extremely Severe", () => {
        expect(isHighRiskAssessment({ Depression: 10, Anxiety: 7, Stress: 12 })).toBe(false);
        expect(isHighRiskAssessment({ Depression: 11, Anxiety: 3, Stress: 7 })).toBe(true);
        expect(isHighRiskAssessment({ Depression: 0, Anxiety: 8, Stress: 0 })).toBe(true);
        expect(isHighRiskAssessment({ Depression: 0, Anxiety: 0, Stress: 13 })).toBe(true);
    });
});
