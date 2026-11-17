export const dynamic = "force-dynamic";

import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError, jsonError, requireAuth } from "@/lib/api/response";
import { isAllowedBlobUrl } from "@/lib/security";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireAuth(req);
        if (auth.error) return auth.error;

        const { id } = await params;

        const material = await prisma.material.findUnique({
            where: { id },
            select: {
                uploadedById: true,
                fileUrl: true,
                files: { select: { fileUrl: true } },
            },
        });

        if (!material) {
            return jsonError("Material not found", 404);
        }

        if (material.uploadedById !== auth.ctx.user.id) {
            return jsonError("Forbidden – you can only delete your own materials", 403);
        }

        await prisma.material.delete({ where: { id } });

        if (process.env.BLOB_READ_WRITE_TOKEN) {
            const blobUrls = Array.from(
                new Set(
                    [material.fileUrl, ...material.files.map((f) => f.fileUrl)].filter(
                        (url): url is string => typeof url === "string" && isAllowedBlobUrl(url)
                    )
                )
            );
            if (blobUrls.length > 0) {
                await del(blobUrls).catch((blobErr) => {
                    console.error("[material DELETE blob cleanup]", blobErr);
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return handlePrismaError(error, "exam-materials DELETE");
    }
}
