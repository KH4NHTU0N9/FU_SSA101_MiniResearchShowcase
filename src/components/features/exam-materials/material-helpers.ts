export interface StagedUploadFile {
    id: string;
    file: File;
    previewUrl?: string;
    uploadedBlob?: { url: string; name: string; size: number };
    status: "pending" | "uploading" | "done" | "error";
    error?: string;
}

export const MAX_CLIENT_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MIME_PREFIXES = ["image/png", "image/jpeg"];

/**
 * Formats a byte count into a human-readable B, KB, or MB string.
 */
export function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Maps a file extension/type string to a short badge label.
 */
export function typeIcon(type: string): string {
    const map: Record<string, string> = {
        PDF: "PDF",
        DOCX: "DOC",
        DOC: "DOC",
        PPTX: "PPT",
        PPT: "PPT",
        ZIP: "ZIP",
        PNG: "IMG",
        JPG: "IMG",
        JPEG: "IMG",
    };
    return map[type.toUpperCase()] ?? "FILE";
}

/**
 * Releases any active object URLs attached to staged upload items.
 */
export function revokeFilePreviews(items: StagedUploadFile[]): void {
    for (const item of items) {
        if (item.previewUrl) {
            URL.revokeObjectURL(item.previewUrl);
        }
    }
}
