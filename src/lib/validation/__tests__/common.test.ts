import { describe, expect, it } from "vitest";
import {
    boundedString,
    normalizedEmailSchema,
    optionalPhoneSchema,
} from "@/lib/validation/common";

describe("validation/common", () => {
    it("normalizes valid emails to lowercase trimmed format and rejects malformed addresses", () => {
        expect(normalizedEmailSchema.parse("  Student.User@FPT.EDU.VN  ")).toBe(
            "student.user@fpt.edu.vn"
        );
        expect(normalizedEmailSchema.safeParse("not-an-email").success).toBe(false);
        expect(normalizedEmailSchema.safeParse("a".repeat(250) + "@b.com").success).toBe(false);
    });

    it("compacts phone separators and collapses empty/undefined phone fields to null", () => {
        expect(optionalPhoneSchema.parse(" 090-123-4567 ")).toBe("0901234567");
        expect(optionalPhoneSchema.parse("+84 (901) 234 567")).toBe("+84901234567");
        expect(optionalPhoneSchema.parse("   ")).toBeNull();
        expect(optionalPhoneSchema.parse(null)).toBeNull();
        expect(optionalPhoneSchema.parse(undefined)).toBeNull();
        expect(optionalPhoneSchema.safeParse("123").success).toBe(false);
        expect(optionalPhoneSchema.safeParse("abc09012345").success).toBe(false);
    });

    it("enforces trimmed minimum and maximum length boundaries in boundedString", () => {
        const schema = boundedString(2, 5, "Title");
        expect(schema.parse("  abc  ")).toBe("abc");
        expect(schema.safeParse(" a ").success).toBe(false);
        expect(schema.safeParse("123456").success).toBe(false);
    });
});
