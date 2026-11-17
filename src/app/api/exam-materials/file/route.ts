export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handlePrismaError, jsonError, requireAuth } from "@/lib/api/response";
import { buildContentDisposition, isAllowedBlobUrl } from "@/lib/security";

function decodeLegacyBase64(dataUri: string): { buffer: Buffer; mimeType: string } | null {
    const commaIdx = dataUri.indexOf(",");
    if (commaIdx === -1) return null;
    const header = dataUri.slice(0, commaIdx);
    const base64Data = dataUri.slice(commaIdx + 1);
    if (!base64Data) return null;
    const mimeType = header.match(/data:([^;]+)/)?.[1] || "application/octet-stream";
    return {
        buffer: Buffer.from(base64Data, "base64"),
        mimeType,
    };
}

async function serveRemoteBlob(
    blobUrl: string,
    filename: string,
    forceDownload: boolean
): Promise<NextResponse> {
    if (!isAllowedBlobUrl(blobUrl)) {
        return jsonError("Forbidden storage origin", 403);
    }

    if (!forceDownload) {
        return NextResponse.redirect(blobUrl);
    }

    const upstream = await fetch(blobUrl);
    if (!upstream.ok) {
        return jsonError("Failed to fetch stored file", 502);
    }

    const buf = await upstream.arrayBuffer();
    return new NextResponse(buf, {
        headers: {
            "Content-Type": upstream.headers.get("Content-Type") || "application/octet-stream",
            "Content-Disposition": buildContentDisposition("attachment", filename),
            "X-Content-Type-Options": "nosniff",
        },
    });
}

function serveLegacyContent(
    fileContent: string,
    filename: string,
    forceDownload: boolean
): NextResponse {
    const decoded = decodeLegacyBase64(fileContent);
    if (!decoded) {
        return jsonError("Invalid legacy file content", 404);
    }

    const disposition = buildContentDisposition(
        forceDownload ? "attachment" : "inline",
        filename
    );

    return new NextResponse(new Uint8Array(decoded.buffer), {
        headers: {
            "Content-Type": decoded.mimeType,
            "Content-Disposition": disposition,
            "Content-Length": String(decoded.buffer.length),
            "Cache-Control": "private, max-age=300",
            "X-Content-Type-Options": "nosniff",
        },
    });
}

export async function GET(req: Request) {
    try {
        const auth = await requireAuth();
        if (auth.error) return auth.error;

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id")?.trim();
        const fileId = searchParams.get("fileId")?.trim();
        const forceDownload = searchParams.get("download") === "1";

        if (!id && !fileId) {
            return jsonError("Missing id or fileId", 400);
        }

        if (fileId) {
            const materialFile = await prisma.materialFile.findUnique({
                where: { id: fileId },
                select: { fileUrl: true, fileContent: true, name: true, materialId: true },
            });
            if (!materialFile) return jsonError("File not found", 404);

            if (forceDownload) {
                prisma.material
                    .update({
                        where: { id: materialFile.materialId },
                        data: { totalDownloads: { increment: 1 } },
                    })
                    .catch(() => {});
            }

            if (materialFile.fileUrl) {
                return await serveRemoteBlob(materialFile.fileUrl, materialFile.name, forceDownload);
            }
            if (!materialFile.fileContent) {
                return jsonError("No file content", 404);
            }
            return serveLegacyContent(materialFile.fileContent, materialFile.name, forceDownload);
        }

        const material = await prisma.material.findUnique({
            where: { id: id! },
            select: {
                fileUrl: true,
                fileContent: true,
                title: true,
                type: true,
                files: {
                    select: { fileUrl: true, fileContent: true, name: true },
                    take: 1,
                },
            },
        });
        if (!material) return jsonError("File not found", 404);

        if (forceDownload) {
            prisma.material
                .update({
                    where: { id: id! },
                    data: { totalDownloads: { increment: 1 } },
                })
                .catch(() => {});
        }

        const primaryFile = material.files[0];
        if (primaryFile?.fileUrl) {
            return await serveRemoteBlob(primaryFile.fileUrl, primaryFile.name, forceDownload);
        }
        if (material.fileUrl) {
            const fallbackName = `${material.title}.${material.type?.toLowerCase() || "bin"}`;
            return await serveRemoteBlob(material.fileUrl, fallbackName, forceDownload);
        }

        const legacyData = primaryFile?.fileContent || material.fileContent;
        if (!legacyData) {
            return jsonError("File not found", 404);
        }
        const fallbackName = primaryFile?.name || `${material.title}.${material.type?.toLowerCase() || "bin"}`;
        return serveLegacyContent(legacyData, fallbackName, forceDownload);
    } catch (error) {
        return handlePrismaError(error, "exam-materials/file GET");
    }
}
