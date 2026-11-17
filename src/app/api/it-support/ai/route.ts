export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
    guardRateLimit,
    jsonError,
    parseJsonBody,
    requireAuth,
} from "@/lib/api/response";
import { aiTutorRequestSchema } from "@/lib/validation";

const SYSTEM_INSTRUCTION =
    "Bạn là một giáo sư Khoa học Máy tính tận tâm. Hãy giải thích ngắn gọn, dễ hiểu, từng bước một bằng tiếng Việt. Phân tích độ phức tạp thời gian (Big O), cơ chế hoạt động, và trích dẫn chuẩn xác từ sách Introduction to Algorithms (CLRS).";

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

export async function POST(req: Request) {
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;

    const rateError = guardRateLimit(
        req,
        "it-support:ai",
        { windowMs: 15 * 60 * 1000, maxRequests: 25 },
        auth.ctx.user.id
    );
    if (rateError) return rateError;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return jsonError(
            "GEMINI_API_KEY chưa được cấu hình trên máy chủ.",
            503
        );
    }

    const parsed = await parseJsonBody(req, aiTutorRequestSchema);
    if (parsed.error) return parsed.error;

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    const payload = {
        contents: [{ parts: [{ text: parsed.data.context }] }],
        systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }],
        },
    };

    const maxAttempts = 3;
    let delayMs = 600;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20_000);
        const onAbort = () => controller.abort();
        req.signal.addEventListener("abort", onAbort, { once: true });

        try {
            const response = await fetch(url, {
                method: "POST",
                signal: controller.signal,
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey,
                },
                body: JSON.stringify(payload),
            });

            clearTimeout(timeoutId);
            req.signal.removeEventListener("abort", onAbort);

            if (response.ok) {
                const data = (await response.json()) as {
                    candidates?: Array<{
                        content?: { parts?: Array<{ text?: string }> };
                    }>;
                };
                const explanation =
                    data.candidates?.[0]?.content?.parts?.[0]?.text ||
                    "Không có phản hồi từ AI.";
                return NextResponse.json({ explanation });
            }

            if (!RETRYABLE_STATUSES.has(response.status) || attempt === maxAttempts) {
                return jsonError(
                    "Không thể kết nối dịch vụ AI lúc này. Vui lòng thử lại sau.",
                    response.status >= 500 ? 502 : response.status
                );
            }
        } catch (error) {
            clearTimeout(timeoutId);
            req.signal.removeEventListener("abort", onAbort);
            if (req.signal.aborted) {
                return jsonError("Request cancelled", 499);
            }
            if (attempt === maxAttempts) {
                console.error("[it-support/ai POST]", error);
                return jsonError("Lỗi kết nối AI sau nhiều lần thử.", 504);
            }
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2;
    }

    return jsonError("AI service unavailable", 502);
}
