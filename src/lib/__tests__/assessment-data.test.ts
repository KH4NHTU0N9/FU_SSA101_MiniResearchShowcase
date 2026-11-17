import { describe, expect, it } from "vitest";
import { questions, shuffleQuestions } from "@/lib/assessment-data";

describe("lib/assessment-data questions and shuffle", () => {
    it("defines exactly 21 unique DASS-21 questions evenly split across 3 subscales", () => {
        expect(questions).toHaveLength(21);
        const ids = new Set(questions.map((q) => q.id));
        expect(ids.size).toBe(21);

        const counts = { Depression: 0, Anxiety: 0, Stress: 0 };
        for (const q of questions) {
            counts[q.category] += 1;
            expect(q.text.trim().length).toBeGreaterThan(5);
        }
        expect(counts).toEqual({ Depression: 7, Anxiety: 7, Stress: 7 });
    });

    it("shuffles without mutating or dropping any questions", () => {
        const originalIds = questions.map((q) => q.id);
        const shuffled = shuffleQuestions(questions);
        expect(shuffled).not.toBe(questions);
        expect(shuffled.map((q) => q.id).sort((a, b) => a - b)).toEqual(originalIds);
        expect(questions.map((q) => q.id)).toEqual(originalIds);
    });
});
