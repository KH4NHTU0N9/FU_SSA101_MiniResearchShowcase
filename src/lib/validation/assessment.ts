import { z } from "zod";

const dassSubscaleScore = z
    .number()
    .int("Score must be an integer")
    .min(0, "Score cannot be negative")
    .max(21, "DASS-21 raw subscale score cannot exceed 21");

/**
 * Validates raw DASS-21 subscale score submissions.
 */
export const createAssessmentSchema = z.object({
    scores: z.object({
        Depression: dassSubscaleScore,
        Anxiety: dassSubscaleScore,
        Stress: dassSubscaleScore,
    }),
});
