import { describe, expect, it } from "vitest";
import {
    MAX_CLIENT_BLOB_FILE_BYTES,
    createMaterialMetaSchema,
    hasAllowedMaterialExtension,
    uploadedFileMetaSchema,
    uploadedFilesArraySchema,
} from "@/lib/validation/exam-materials";

describe("validation/exam-materials", () => {
    it("allows safe study document extensions and blocks executables/scripts", () => {
        expect(hasAllowedMaterialExtension("notes.PDF")).toBe(true);
        expect(hasAllowedMaterialExtension("slides.pptx")).toBe(true);
        expect(hasAllowedMaterialExtension("diagram.png")).toBe(true);
        expect(hasAllowedMaterialExtension("malware.exe")).toBe(false);
        expect(hasAllowedMaterialExtension("payload.pdf.sh")).toBe(false);
    });

    it("rejects untrusted URLs, empty files, and >10MB blobs in uploadedFileMetaSchema", () => {
        const valid = uploadedFileMetaSchema.safeParse({
            url: "https://store1.public.blob.vercel-storage.com/notes.pdf",
            name: "CSD201-Notes.pdf",
            size: 1024,
        });
        expect(valid.success).toBe(true);

        expect(
            uploadedFileMetaSchema.safeParse({
                url: "http://127.0.0.1/notes.pdf",
                name: "CSD201-Notes.pdf",
                size: 1024,
            }).success
        ).toBe(false);

        expect(
            uploadedFileMetaSchema.safeParse({
                url: "https://store1.public.blob.vercel-storage.com/notes.pdf",
                name: "CSD201-Notes.pdf",
                size: MAX_CLIENT_BLOB_FILE_BYTES + 1,
            }).success
        ).toBe(false);
    });

    it("validates material metadata and batch file arrays", () => {
        expect(
            createMaterialMetaSchema.safeParse({
                title: "MAE101 Review",
                description: null,
                semesterId: "sem_1",
                subjectId: "sub_1",
            }).success
        ).toBe(true);

        expect(uploadedFilesArraySchema.safeParse([]).success).toBe(false);
    });
});
