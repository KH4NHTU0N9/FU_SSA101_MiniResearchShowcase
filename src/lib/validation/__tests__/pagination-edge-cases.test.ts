import { describe, expect, it } from "vitest";
import { parsePaginationParams } from "@/lib/validation/common";

describe("validation/parsePaginationParams", () => {
    it("uses defaults when query parameters are missing or unparseable", () => {
        expect(parsePaginationParams(null, null)).toEqual({
            page: 1,
            limit: 10,
            skip: 0,
        });
        expect(parsePaginationParams("abc", "xyz", 20, 50)).toEqual({
            page: 1,
            limit: 20,
            skip: 0,
        });
    });

    it("clamps non-positive numbers to safe minimums and oversized limits/pages to ceilings", () => {
        expect(parsePaginationParams("-5", "0", 10, 50)).toEqual({
            page: 1,
            limit: 10,
            skip: 0,
        });
        expect(parsePaginationParams("999999", "999", 10, 50)).toEqual({
            page: 10_000,
            limit: 50,
            skip: 9_999 * 50,
        });
    });

    it("computes exact skip offset for normal pagination slices", () => {
        expect(parsePaginationParams("3", "15", 10, 50)).toEqual({
            page: 3,
            limit: 15,
            skip: 30,
        });
    });
});
