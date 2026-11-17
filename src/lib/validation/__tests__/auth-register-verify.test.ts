import { describe, expect, it } from "vitest";
import {
    otpCodeSchema,
    registerSchema,
    verifyRegistrationSchema,
} from "@/lib/validation/auth";

describe("validation/auth register & verify schemas", () => {
    it("validates 6-digit numeric OTP format", () => {
        expect(otpCodeSchema.parse(" 042918 ")).toBe("042918");
        expect(otpCodeSchema.safeParse("12345").success).toBe(false);
        expect(otpCodeSchema.safeParse("12345a").success).toBe(false);
    });

    it("validates complete registration payload and enforces password policy", () => {
        const valid = registerSchema.safeParse({
            name: " Nguyen Van A ",
            email: "USER@FPT.EDU.VN",
            phone: "0912 345 678",
            password: "Password123!",
        });
        expect(valid.success).toBe(true);
        if (valid.success) {
            expect(valid.data.email).toBe("user@fpt.edu.vn");
            expect(valid.data.name).toBe("Nguyen Van A");
            expect(valid.data.phone).toBe("0912345678");
        }

        expect(
            registerSchema.safeParse({
                email: "user@fpt.edu.vn",
                password: "short",
            }).success
        ).toBe(false);
    });

    it("validates verifyRegistration payload", () => {
        expect(
            verifyRegistrationSchema.safeParse({
                email: "STUDENT@FPT.EDU.VN",
                code: "654321",
            })
        ).toEqual({
            success: true,
            data: { email: "student@fpt.edu.vn", code: "654321" },
        });
    });
});
