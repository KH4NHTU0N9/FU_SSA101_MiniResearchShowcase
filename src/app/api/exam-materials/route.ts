export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    guardRateLimit,
    handlePrismaError,
    jsonError,
    requireAuth,
} from "@/lib/api/response";
import { sanitizeFilename } from "@/lib/security";
import {
    createMaterialMetaSchema,
    hasAllowedMaterialExtension,
    MAX_DIRECT_SERVER_FILE_BYTES,
    parsePaginationParams,
    uploadedFilesArraySchema,
} from "@/lib/validation";

const MIME_MAP: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ppt: "application/vnd.ms-powerpoint",
    zip: "application/zip",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
};

export async function GET(req: Request) {
    try {
        const auth = await requireAuth();
        if (auth.error) return auth.error;

        const { searchParams } = new URL(req.url);
        const semesterId = searchParams.get("semesterId")?.trim() || undefined;
        const subjectId = searchParams.get("subjectId")?.trim() || undefined;
        const search = searchParams.get("search")?.trim().slice(0, 120) || "";
        const { page, limit, skip } = parsePaginationParams(
            searchParams.get("page"),
            searchParams.get("limit"),
            20,
            50
        );

        const where: Record<string, unknown> = { status: "APPROVED" };
        if (semesterId) where.semesterId = semesterId;
        if (subjectId) where.subjectId = subjectId;
        if (search) {
            where.OR = [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { subject: { code: { contains: search, mode: "insensitive" } } },
                { semester: { name: { contains: search, mode: "insensitive" } } },
            ];
        }

        const [materials, total] = await Promise.all([
            prisma.material.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    fileUrl: true,
                    size: true,
                    type: true,
                    totalDownloads: true,
                    createdAt: true,
                    semester: { select: { id: true, name: true } },
                    subject: { select: { id: true, code: true } },
                    uploadedBy: { select: { id: true, name: true } },
                    files: {
                        select: { id: true, name: true, type: true, fileUrl: true, size: true },
                    },
                },
            }),
            prisma.material.count({ where }),
        ]);

        return NextResponse.json({ materials, total, page, limit });
    } catch (error) {
        return handlePrismaError(error, "exam-materials GET");
    }
}

export async function POST(req: Request) {
    try {
        const auth = await requireAuth(req);
        if (auth.error) return auth.error;

        const rateError = guardRateLimit(
            req,
            "exam-materials:post",
            { windowMs: 15 * 60 * 1000, maxRequests: 20 },
            auth.ctx.user.id
        );
        if (rateError) return rateError;

        let formData: FormData;
        try {
            formData = await req.formData();
        } catch {
            return jsonError("Expected multipart form data", 400);
        }

        const metaParsed = createMaterialMetaSchema.safeParse({
            title: String(formData.get("title") ?? ""),
            description: formData.get("description") ? String(formData.get("description")) : null,
            semesterId: String(formData.get("semesterId") ?? ""),
            subjectId: String(formData.get("subjectId") ?? ""),
        });

        if (!metaParsed.success) {
            return jsonError(metaParsed.error.issues[0]?.message || "Invalid material metadata", 400);
        }

        const { title, description, semesterId, subjectId } = metaParsed.data;

        const subject = await prisma.subject.findFirst({
            where: { id: subjectId, semesterId },
            select: { id: true },
        });
        if (!subject) {
            return jsonError("Selected semester and subject do not exist or do not match.", 400);
        }

        const uploadedFilesRaw = formData.get("uploadedFiles");
        const directFiles = formData
            .getAll("files")
            .filter((entry): entry is File => entry instanceof File);

        let materialFiles: { url: string; name: string; size: number }[] = [];

        if (typeof uploadedFilesRaw === "string" && uploadedFilesRaw.trim().length > 0) {
            let parsedJson: unknown;
            try {
                parsedJson = JSON.parse(uploadedFilesRaw);
            } catch {
                return jsonError("Invalid uploadedFiles JSON payload", 400);
            }

            const filesValidated = uploadedFilesArraySchema.safeParse(parsedJson);
            if (!filesValidated.success) {
                return jsonError(
                    filesValidated.error.issues[0]?.message || "Invalid uploadedFiles metadata",
                    400
                );
            }

            materialFiles = filesValidated.data.map((f) => ({
                url: f.url,
                name: sanitizeFilename(f.name, "material"),
                size: f.size,
            }));
        } else if (directFiles.length > 0) {
            if (!process.env.BLOB_READ_WRITE_TOKEN) {
                return jsonError("File storage is not configured on the server.", 503);
            }

            for (const file of directFiles) {
                const safeName = sanitizeFilename(file.name, "file");
                if (!hasAllowedMaterialExtension(safeName)) {
                    return jsonError(`File type not allowed: ${safeName}`, 400);
                }
                if (file.size <= 0 || file.size > MAX_DIRECT_SERVER_FILE_BYTES) {
                    return jsonError(
                        `File size invalid for direct upload (${safeName}). Max 4.5MB.`,
                        400
                    );
                }
            }

            materialFiles = await Promise.all(
                directFiles.map(async (file) => {
                    const safeName = sanitizeFilename(file.name, "file");
                    const ext = safeName.split(".").pop()?.toLowerCase() || "bin";
                    const contentType = MIME_MAP[ext] || "application/octet-stream";

                    const blob = await put(
                        `exam-materials/${Date.now()}-${safeName}`,
                        file,
                        {
                            access: "public",
                            contentType,
                            addRandomSuffix: true,
                        }
                    );

                    return { url: blob.url, name: safeName, size: file.size };
                })
            );
        }

        if (materialFiles.length === 0) {
            return jsonError("No files provided", 400);
        }

        const totalSize = materialFiles.reduce((acc, f) => acc + f.size, 0);
        const primaryExt = materialFiles[0].name.split(".").pop()?.toUpperCase() || "UNKNOWN";

        const material = await prisma.$transaction(async (tx) => {
            const created = await tx.material.create({
                data: {
                    title,
                    description: description || null,
                    fileUrl: materialFiles[0].url,
                    size: totalSize,
                    type: materialFiles.length > 1 ? "MULTIPLE" : primaryExt,
                    semesterId,
                    subjectId,
                    uploadedById: auth.ctx.user.id,
                    status: "APPROVED",
                },
            });

            await tx.materialFile.createMany({
                data: materialFiles.map((file) => ({
                    materialId: created.id,
                    name: file.name,
                    fileUrl: file.url,
                    type: file.name.split(".").pop()?.toUpperCase() || "BIN",
                    size: file.size,
                })),
            });

            return created;
        });

        return NextResponse.json(
            {
                id: material.id,
                title: material.title,
                type: material.type,
                size: material.size,
                createdAt: material.createdAt,
            },
            { status: 201 }
        );
    } catch (error) {
        return handlePrismaError(error, "exam-materials POST");
    }
}
