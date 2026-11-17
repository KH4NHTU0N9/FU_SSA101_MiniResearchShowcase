import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendMailMock, createTransportMock } = vi.hoisted(() => {
    const sendMail = vi.fn();
    const createTransport = vi.fn(() => ({
        sendMail,
    }));
    return { sendMailMock: sendMail, createTransportMock: createTransport };
});

vi.mock("nodemailer", () => ({
    default: {
        createTransport: createTransportMock,
    },
    createTransport: createTransportMock,
}));

import {
    resetEmailTransporter,
    sendEmailChangeVerification,
    sendPasswordResetEmail,
    sendVerificationEmail,
} from "@/lib/email";

describe("lib/email delivery and security", () => {
    beforeEach(() => {
        resetEmailTransporter();
        sendMailMock.mockReset();
        createTransportMock.mockClear();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("skips sending cleanly when SMTP credentials are absent or placeholder example.com", async () => {
        vi.stubEnv("SMTP_USER", "");
        vi.stubEnv("SMTP_PASS", "");
        await expect(sendVerificationEmail("user@fpt.edu.vn", "123456")).resolves.toBe(false);

        vi.stubEnv("SMTP_USER", "noreply@example.com");
        vi.stubEnv("SMTP_PASS", "pass");
        await expect(sendVerificationEmail("user@fpt.edu.vn", "123456")).resolves.toBe(false);
        expect(createTransportMock).not.toHaveBeenCalled();
    });

    it("creates pooled STARTTLS transporter on port 587 and escapes HTML characters", async () => {
        vi.stubEnv("SMTP_HOST", "smtp.gmail.com");
        vi.stubEnv("SMTP_PORT", "587");
        vi.stubEnv("SMTP_USER", "mailer@fpt.edu.vn");
        vi.stubEnv("SMTP_PASS", "app-secret-password");
        sendMailMock.mockResolvedValue({ messageId: "msg_1" });

        const sent = await sendVerificationEmail("student@fpt.edu.vn", "<script>999999</script>");
        expect(sent).toBe(true);
        expect(createTransportMock).toHaveBeenCalledWith(
            expect.objectContaining({
                port: 587,
                secure: false,
                requireTLS: true,
                pool: true,
            })
        );

        const mailArgs = sendMailMock.mock.calls[0]?.[0] as { html: string; subject: string };
        expect(mailArgs.subject).toContain("Verification Code");
        expect(mailArgs.html).toContain("&lt;script&gt;999999&lt;/script&gt;");
        expect(mailArgs.html).not.toContain("<script>");
    });

    it("sends password reset and email-change notifications and returns false on SMTP error", async () => {
        vi.stubEnv("SMTP_PORT", "465");
        vi.stubEnv("SMTP_USER", "mailer@fpt.edu.vn");
        vi.stubEnv("SMTP_PASS", "app-secret-password");

        sendMailMock.mockResolvedValueOnce({});
        expect(await sendPasswordResetEmail("user@fpt.edu.vn", "654321")).toBe(true);

        sendMailMock.mockRejectedValueOnce(new Error("SMTP connection refused"));
        expect(await sendEmailChangeVerification("new@fpt.edu.vn", "111222")).toBe(false);
    });
});
