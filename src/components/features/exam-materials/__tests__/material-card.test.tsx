import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MaterialCard } from "@/components/features/exam-materials/material-card";
import type { ExamMaterialDTO } from "@/types";

const sampleMaterial: ExamMaterialDTO = {
    id: "m1",
    title: "PRN212 Midterm Bank",
    description: "Annotated past papers",
    type: "PDF",
    fileUrl: null,
    size: 2048,
    totalDownloads: 7,
    createdAt: "2026-03-01T00:00:00.000Z",
    semester: { id: "sem1", name: "Spring 2026" },
    subject: { id: "sub1", code: "PRN212" },
    uploadedBy: { id: "u1", name: "An Nguyen" },
};

describe("features/exam-materials/MaterialCard", () => {
    it("renders material metadata, byte formatting, and owner delete button", () => {
        const onPreview = vi.fn();
        const onDownload = vi.fn();
        const onShare = vi.fn();
        const onDelete = vi.fn();

        render(
            <MaterialCard
                material={sampleMaterial}
                onPreview={onPreview}
                onDownload={onDownload}
                onShare={onShare}
                onDelete={onDelete}
                copied={false}
                isOwn={true}
            />
        );

        expect(screen.getByText("PRN212 Midterm Bank")).toBeInTheDocument();
        expect(screen.getByText("2.0 KB")).toBeInTheDocument();
        expect(screen.getByText("Spring 2026")).toBeInTheDocument();
        expect(screen.getByText("PRN212")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /Preview/i }));
        fireEvent.click(screen.getByRole("button", { name: /Download/i }));
        fireEvent.click(screen.getByRole("button", { name: /Copy share link/i }));
        fireEvent.click(screen.getByRole("button", { name: /Delete PRN212 Midterm Bank/i }));

        expect(onPreview).toHaveBeenCalledTimes(1);
        expect(onDownload).toHaveBeenCalledTimes(1);
        expect(onShare).toHaveBeenCalledTimes(1);
        expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it("hides delete action for materials owned by other users", () => {
        render(
            <MaterialCard
                material={sampleMaterial}
                onPreview={vi.fn()}
                onDownload={vi.fn()}
                onShare={vi.fn()}
                onDelete={vi.fn()}
                copied={true}
                isOwn={false}
            />
        );

        expect(screen.queryByRole("button", { name: /Delete /i })).not.toBeInTheDocument();
    });
});
