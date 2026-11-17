import { z } from "zod";

export const ALLOWED_EMOTIONS = ["anxious", "tired", "pressure", "normal", "excited"] as const;

/**
 * Validates daily mood check-in submissions.
 */
export const createMoodSchema = z.object({
    mood: z.number().int().min(1).max(5),
    energy: z.number().int().min(0).max(100),
    focus: z.number().int().min(0).max(100),
    emotion: z.enum(ALLOWED_EMOTIONS),
    note: z.string().trim().max(500).optional().default(""),
});
