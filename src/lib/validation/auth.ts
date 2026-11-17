import { z } from "zod";
import { validatePasswordPolicy } from "@/lib/security/password";
import { boundedString, normalizedEmailSchema, optionalPhoneSchema } from "./common";

const passwordPolicySchema = z
    .string()
    .superRefine((val, ctx) => {
        const result = validatePasswordPolicy(val);
        if (!result.valid) {
            ctx.addIssue({
                code: "custom",
                message: result.error ?? "Invalid password",
            });
        }
    });

export const otpCodeSchema = z
    .string()
    .trim()
    .regex(/^[0-9]{6}$/, "Verification code must be a 6-digit number");

export const registerSchema = z.object({
    name: boundedString(1, 100, "Name").optional(),
    email: normalizedEmailSchema,
    phone: optionalPhoneSchema.optional(),
    password: passwordPolicySchema,
});

export const verifyRegistrationSchema = z.object({
    email: normalizedEmailSchema,
    code: otpCodeSchema,
});

export const loginSchema = z.object({
    identifier: z.string().trim().min(1, "Email or phone number is required").max(254),
    password: z.string().min(1, "Password is required").max(256),
});

export const forgotPasswordSchema = z.object({
    email: normalizedEmailSchema,
});

export const resetPasswordSchema = z.object({
    email: normalizedEmailSchema,
    code: otpCodeSchema,
    newPassword: passwordPolicySchema,
});

export const updateProfileSchema = z.object({
    action: z.literal("updateProfile"),
    name: z
        .union([z.string(), z.null(), z.undefined()])
        .transform((val) => {
            if (typeof val !== "string") return undefined;
            const trimmed = val.trim();
            return trimmed.length > 0 ? trimmed : null;
        })
        .refine((val) => val === undefined || val === null || val.length <= 100, "Name is too long"),
    phone: optionalPhoneSchema.optional(),
});

export const requestEmailChangeSchema = z.object({
    action: z.literal("requestEmailChange"),
    newEmail: normalizedEmailSchema,
    currentPassword: z.string().min(1, "Current password is required").max(256),
});

export const confirmEmailChangeSchema = z.object({
    action: z.literal("confirmEmailChange"),
    code: otpCodeSchema,
});

export const changePasswordSchema = z.object({
    action: z.literal("changePassword"),
    currentPassword: z.string().min(1, "Current password is required").max(256),
    newPassword: passwordPolicySchema,
});
