import { z } from "zod";
import { boundedString } from "./common";

export const POST_CATEGORIES = ["ACADEMIC", "PSYCHOLOGY", "RESOURCES", "OTHER"] as const;

export const createPostSchema = z.object({
    content: boundedString(1, 3000, "Post content"),
    category: z.enum(POST_CATEGORIES).default("OTHER"),
});

export const createCommentSchema = z.object({
    content: boundedString(1, 1500, "Comment"),
});
