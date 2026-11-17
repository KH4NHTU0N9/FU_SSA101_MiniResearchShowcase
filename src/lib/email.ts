import nodemailer, { type Transporter } from "nodemailer";
import { escapeHtml } from "@/lib/security/crypto";

let cachedTransporter: Transporter | null = null;
let cachedConfigKey: string | null = null;

function isSmtpConfigured(): boolean {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    return Boolean(user && pass && !user.includes("example.com"));
}

function getTransporter(): Transporter | null {
    if (!isSmtpConfigured()) {
        return null;
    }

    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER!;
    const pass = process.env.SMTP_PASS!;
    const key = `${host}:${port}:${user}`;

    if (!cachedTransporter || cachedConfigKey !== key) {
        cachedTransporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            requireTLS: port === 587,
            pool: true,
            maxConnections: 5,
            auth: { user, pass },
        });
        cachedConfigKey = key;
    }

    return cachedTransporter;
}

/**
 * Resets cached SMTP transporter (intended for tests).
 */
export function resetEmailTransporter(): void {
    cachedTransporter = null;
    cachedConfigKey = null;
}

async function sendCodeEmail(options: {
    to: string;
    subject: string;
    heading: string;
    intro: string;
    code: string;
    accentColor?: string;
    footerNote: string;
}): Promise<boolean> {
    const transporter = getTransporter();
    if (!transporter) {
        console.warn("SMTP credentials are not configured; email delivery skipped.");
        return false;
    }

    const safeCode = escapeHtml(options.code);
    const safeHeading = escapeHtml(options.heading);
    const safeIntro = escapeHtml(options.intro);
    const safeFooter = escapeHtml(options.footerNote);
    const accent = options.accentColor || "#0ea5e9";

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || '"PsychSupport Team" <no-reply@example.com>',
            to: options.to,
            subject: options.subject,
            text: `${options.intro}\n\nYour verification code is: ${options.code}\n\n${options.footerNote}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4; border-radius: 8px;">
                    <h2 style="color: #333;">${safeHeading}</h2>
                    <p>${safeIntro}</p>
                    <div style="background: #fff; padding: 15px; border-radius: 5px; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; border: 1px solid #ddd; color: ${accent};">
                        ${safeCode}
                    </div>
                    <p style="margin-top: 20px; font-size: 12px; color: #666;">${safeFooter}</p>
                </div>
            `,
        });
        return true;
    } catch (error) {
        console.error("Failed to send email:", error);
        return false;
    }
}

export async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
    return await sendCodeEmail({
        to,
        subject: "Your Verification Code - PsychSupport",
        heading: "Welcome to PsychSupport!",
        intro: "Please use the following 6-digit code to verify your account:",
        code,
        accentColor: "#0f172a",
        footerNote: "This code expires in 15 minutes. If you did not request this, please ignore this email.",
    });
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<boolean> {
    return await sendCodeEmail({
        to,
        subject: "Reset Your Password - PsychSupport",
        heading: "Reset Your Password",
        intro: "You requested a password reset. Use the code below to proceed:",
        code,
        accentColor: "#e11d48",
        footerNote: "This code expires in 15 minutes. If you did not request this, please ignore this email.",
    });
}

export async function sendEmailChangeVerification(to: string, code: string): Promise<boolean> {
    return await sendCodeEmail({
        to,
        subject: "Verify Your New Email - PsychSupport",
        heading: "Confirm Email Address Change",
        intro: "Enter the verification code below to confirm your new email address:",
        code,
        accentColor: "#0284c7",
        footerNote: "This code expires in 15 minutes. If you did not request an email change, secure your account immediately.",
    });
}
