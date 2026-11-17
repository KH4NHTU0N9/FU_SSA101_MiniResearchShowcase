export const dynamic = "force-dynamic";

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { guardOrigin, guardRateLimit, jsonError } from "@/lib/api/response";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { hasAllowedMaterialExtension, MAX_CLIENT_BLOB_FILE_BYTES } from "@/lib/validation";

const ALLOWED_UPLOAD_CONTENT_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
    "application/zip",
    "image/png",
    "image/jpeg",
];

export async function POST(request: Request): Promise<NextResponse> {
    const originError = guardOrigin(request);
    if (originError) return originError;

    const rateError = guardRateLimit(request, "exam-materials:upload", {
        windowMs: 15 * 60 * 1000,
        maxRequests: 40,
    });
    if (rateError) return rateError;

    let body: HandleUploadBody;
    try {
        body = (await request.json()) as HandleUploadBody;
    } catch {
        return jsonError("Invalid upload request body", 400);
    }

    try {
        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname: string) => {
                const session = await getSession();
                if (!session?.user?.id) {
                    throw new Error("Unauthorized");
                }

                const dbUser = await prisma.user.findUnique({
                    where: { id: session.user.id },
                    select: { id: true, tokenVersion: true },
                });
                if (!dbUser || dbUser.tokenVersion !== session.user.tokenVersion) {
                    throw new Error("Unauthorized");
                }

                if (!hasAllowedMaterialExtension(pathname)) {
                    throw new Error("Unsupported or blocked file extension");
                }

                return {
                    allowedContentTypes: ALLOWED_UPLOAD_CONTENT_TYPES,
                    maximumSizeInBytes: MAX_CLIENT_BLOB_FILE_BYTES,
                    addRandomSuffix: true,
                    tokenPayload: JSON.stringify({
                        userId: dbUser.id,
                    }),
                };
            },
            onUploadCompleted: async ({ blob }) => {
                console.info("[exam-materials/upload] Blob upload completed:", blob.pathname);
            },
        });

        return NextResponse.json(jsonResponse);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        const status = message === "Unauthorized" ? 401 : 400;
        return jsonError(message, status);
    }
}
