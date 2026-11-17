/**
 * Academic subject belonging to a semester.
 */
export interface ExamSubjectDTO {
    id: string;
    code: string;
}

/**
 * Academic semester with nested subjects for filter dropdowns.
 */
export interface ExamSemesterDTO {
    id: string;
    name: string;
    subjects: ExamSubjectDTO[];
}

/**
 * Individual uploaded file attached to an exam material item.
 */
export interface ExamMaterialFileDTO {
    id: string;
    name: string;
    type: string;
    fileUrl: string;
    size: number;
}

/**
 * Exam material metadata returned by GET /api/exam-materials.
 */
export interface ExamMaterialDTO {
    id: string;
    title: string;
    description?: string | null;
    fileUrl: string | null;
    size: number;
    type: string;
    totalDownloads: number;
    createdAt: string;
    semester: { id: string; name: string };
    subject: { id: string; code: string };
    uploadedBy: { id: string; name?: string | null };
    files?: ExamMaterialFileDTO[];
}
