import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MaterialPreviewModal } from "@/components/features/exam-materials/material-preview-modal";
import type { ExamMaterialDTO } from "@/types";

const multiFileMaterial: ExamMaterialDTO = {
    id: "m1",
    title: "CSD201 Lab Package",
    description: null,
    type: "PDF",
    fileUrl: null,
    size: 4096,
    totalDownloads: 3,
    createdAt: "2026-03-01T00:00:00.000Z",
    semester: { id: "sem1", name: "Spring 2026" },
    subject: { id: "sub1", code: "CSD201" },
    uploadedBy: { id: "u1", name: "Minh" },
    files: [
        {
            id: "f1",
            name: "guide.pdf",
            fileUrl: "https://store.public.blob.vercel-storage.com/guide.pdf",
            type: "PDF",
            size: 2048,
        },
        {
            id: "f2",
            name: "rubric.docx",
            fileUrl: "https://store.public.blob.vercel-storage.com/rubric.docx",
            type: "DOCX",
            size: 2048,
        },
    ],
};

describe("features/exam-materials/MaterialPreviewModal", () => {
    it("renders PDF iframe alongside fallback download for unsupported file types", () => {
        const onClose = vi.fn();
        const onDownloadMaterial = vi.fn();
        const onDownloadFile = vi.fn();

        render(
            <MaterialPreviewModal
                material={multiFileMaterial}
                onClose={onClose}
                onDownloadMaterial={onDownloadMaterial}
                onDownloadFile={onDownloadFile}
            />
        );

        expect(screen.getByTitle("guide.pdf")).toHaveAttribute(
            "src",
            "/api/exam-materials/file?fileId=f1"
        );
        expect(screen.getByText("Preview not available for DOCX files")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /Download rubric\.docx/i }));
        expect(onDownloadFile).toHaveBeenCalledWith(
            "/api/exam-materials/file?fileId=f2&download=1",
            "rubric.docx",
            "m1"
        );

        fireEvent.click(screen.getByRole("button", { name: /^Download$/i }));
        expect(onDownloadMaterial).toHaveBeenCalledWith(multiFileMaterial);

        fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
