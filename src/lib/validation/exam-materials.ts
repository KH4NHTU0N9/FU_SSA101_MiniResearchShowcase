import { z } from "zod";
import { isAllowedBlobUrl } from "@/lib/security/headers";
import { boundedString } from "./common";

export const ALLOWED_MATERIAL_EXTENSIONS = [
    ".pdf",
    ".docx",
    ".doc",
    ".pptx",
    ".ppt",
    ".zip",
    ".png",
    ".jpg",
    ".jpeg",
] as const;

export const BLOCKED_MATERIAL_EXTENSIONS = [
    ".exe",
    ".sh",
    ".bat",
    ".cmd",
    ".ps1",
    ".vbs",
    ".msi",
    ".dll",
] as const;

export const MAX_CLIENT_BLOB_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_DIRECT_SERVER_FILE_BYTES = 4.5 * 1024 * 1024;

export function hasAllowedMaterialExtension(filename: string): boolean {
    const lower = filename.trim().toLowerCase();
    if (BLOCKED_MATERIAL_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
        return false;
    }
    return ALLOWED_MATERIAL_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export const uploadedFileMetaSchema = z.object({
    url: z
        .string()
        .trim()
        .refine((val) => isAllowedBlobUrl(val), "Invalid or untrusted file storage URL"),
    name: boundedString(1, 255, "Filename").refine(
        hasAllowedMaterialExtension,
        "Unsupported or unsafe file extension"
    ),
    size: z
        .number()
        .int()
        .min(1, "File cannot be empty")
        .max(MAX_CLIENT_BLOB_FILE_BYTES, "File exceeds 10MB limit"),
});

export const createMaterialMetaSchema = z.object({
    title: boundedString(1, 200, "Title"),
    description: z.string().trim().max(2000).optional().nullable(),
    semesterId: boundedString(1, 64, "Semester"),
    subjectId: boundedString(1, 64, "Subject"),
});

export const uploadedFilesArraySchema = z.array(uploadedFileMetaSchema).min(1).max(20);
