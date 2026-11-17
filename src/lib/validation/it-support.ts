import { z } from "zod";
import { boundedString } from "./common";

/**
 * Validates prompts forwarded to the server-side IT Support AI Tutor proxy.
 */
export const aiTutorRequestSchema = z.object({
    context: boundedString(3, 2000, "Prompt context"),
});
