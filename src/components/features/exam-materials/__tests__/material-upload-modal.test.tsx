import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
    MAX_CLIENT_FILE_BYTES,
    type StagedUploadFile,
} from "@/components/features/exam-materials/material-helpers";
import {
    MaterialUploadModal,
    type UploadMaterialFormState,
} from "@/components/features/exam-materials/material-upload-modal";
import type { ExamSemesterDTO } from "@/types";

const semesters: ExamSemesterDTO[] = [
    {
        id: "sem1",
        name: "Semester 1",
        subjects: [{ id: "sub1", code: "MAE101" }],
    },
];

function UploadModalHarness({
    onSubmit,
    initialError = "",
}: {
    onSubmit: () => void;
    initialError?: string;
}) {
    const [form, setForm] = useState<UploadMaterialFormState>({
        title: "",
        description: "",
        semesterId: "sem1",
        subjectId: "sub1",
    });
    const [staged, setStaged] = useState<StagedUploadFile[]>([]);
    const [error, setError] = useState(initialError);

    return (
        <MaterialUploadModal
            semesters={semesters}
            uploadForm={form}
            onChangeForm={setForm}
            stagedFiles={staged}
            setStagedFiles={setStaged}
            uploading={false}
            uploadError={error}
            setUploadError={setError}
            onSubmit={onSubmit}
            onClose={vi.fn()}
        />
    );
}

describe("features/exam-materials/MaterialUploadModal", () => {
    it("rejects files exceeding 10MB and allows staging + removing valid files", () => {
        const onSubmit = vi.fn();
        const { container } = render(<UploadModalHarness onSubmit={onSubmit} />);

        const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
        const hugeFile = new File(["x"], "huge.pdf", { type: "application/pdf" });
        Object.defineProperty(hugeFile, "size", { value: MAX_CLIENT_FILE_BYTES + 1 });

        fireEvent.change(fileInput, { target: { files: [hugeFile] } });
        expect(screen.getByRole("alert")).toHaveTextContent(
            'File "huge.pdf" exceeds the 10MB size limit.'
        );

        const validFile = new File(["doc"], "notes.docx", {
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
        fireEvent.change(fileInput, { target: { files: [validFile] } });

        expect(screen.getByText("notes.docx")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Upload File/i })).toBeEnabled();

        fireEvent.click(screen.getByRole("button", { name: /Upload File/i }));
        expect(onSubmit).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole("button", { name: "Remove" }));
        expect(screen.queryByText("notes.docx")).not.toBeInTheDocument();
    });
});
