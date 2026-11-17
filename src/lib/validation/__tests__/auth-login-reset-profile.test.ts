import { describe, expect, it } from "vitest";
import {
    changePasswordSchema,
    confirmEmailChangeSchema,
    forgotPasswordSchema,
    loginSchema,
    requestEmailChangeSchema,
    resetPasswordSchema,
    updateProfileSchema,
} from "@/lib/validation/auth";

describe("validation/auth login, reset, and profile schemas", () => {
    it("validates email or phone login identifiers", () => {
        expect(
            loginSchema.safeParse({ identifier: "0901234567", password: "secret" }).success
        ).toBe(true);
        expect(loginSchema.safeParse({ identifier: "   ", password: "secret" }).success).toBe(
            false
        );
    });

    it("validates forgotPassword and resetPassword schemas", () => {
        expect(forgotPasswordSchema.parse({ email: " Test@FPT.EDU.VN " })).toEqual({
            email: "test@fpt.edu.vn",
        });
        expect(
            resetPasswordSchema.safeParse({
                email: "test@fpt.edu.vn",
                code: "123456",
                newPassword: "NewStrongPassword!",
            }).success
        ).toBe(true);
        expect(
            resetPasswordSchema.safeParse({
                email: "test@fpt.edu.vn",
                code: "123456",
                newPassword: "123",
            }).success
        ).toBe(false);
    });

    it("validates profile update, email change workflow, and password change actions", () => {
        expect(
            updateProfileSchema.parse({
                action: "updateProfile",
                name: "   ",
                phone: "098-765-4321",
            })
        ).toEqual({
            action: "updateProfile",
            name: null,
            phone: "0987654321",
        });

        expect(
            requestEmailChangeSchema.safeParse({
                action: "requestEmailChange",
                newEmail: "NEW@FPT.EDU.VN",
                currentPassword: "old-password",
            }).success
        ).toBe(true);

        expect(
            confirmEmailChangeSchema.safeParse({
                action: "confirmEmailChange",
                code: "888999",
            }).success
        ).toBe(true);

        expect(
            changePasswordSchema.safeParse({
                action: "changePassword",
                currentPassword: "old-password",
                newPassword: "UpdatedPassword#2026",
            }).success
        ).toBe(true);
    });
});
