import { describe, expect, it } from "vitest";
import {
    POST_CATEGORIES,
    createCommentSchema,
    createPostSchema,
} from "@/lib/validation/community";

describe("validation/community", () => {
    it("defaults missing post category to OTHER and accepts all enum categories", () => {
        expect(createPostSchema.parse({ content: "  Exam tips please  " })).toEqual({
            content: "Exam tips please",
            category: "OTHER",
        });

        for (const category of POST_CATEGORIES) {
            expect(
                createPostSchema.safeParse({ content: "Valid post", category }).success
            ).toBe(true);
        }
    });

    it("rejects empty or oversized post and comment payloads", () => {
        expect(createPostSchema.safeParse({ content: "   ", category: "ACADEMIC" }).success).toBe(
            false
        );
        expect(
            createPostSchema.safeParse({ content: "x".repeat(3001), category: "ACADEMIC" }).success
        ).toBe(false);
        expect(createCommentSchema.safeParse({ content: "" }).success).toBe(false);
        expect(createCommentSchema.safeParse({ content: "x".repeat(1501) }).success).toBe(false);
    });
});
