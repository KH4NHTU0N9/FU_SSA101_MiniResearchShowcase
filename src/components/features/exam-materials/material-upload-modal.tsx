"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import Image from "next/image";
import { AlertCircle, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ExamSemesterDTO } from "@/types";
import {
    ALLOWED_MIME_PREFIXES,
    formatSize,
    MAX_CLIENT_FILE_BYTES,
    typeIcon,
    type StagedUploadFile,
} from "./material-helpers";

export interface UploadMaterialFormState {
    title: string;
    description: string;
    semesterId: string;
    subjectId: string;
}

export interface MaterialUploadModalProps {
    semesters: ExamSemesterDTO[];
    uploadForm: UploadMaterialFormState;
    onChangeForm: Dispatch<SetStateAction<UploadMaterialFormState>>;
    stagedFiles: StagedUploadFile[];
    setStagedFiles: Dispatch<SetStateAction<StagedUploadFile[]>>;
    uploading: boolean;
    uploadError: string;
    setUploadError: (error: string) => void;
    onSubmit: () => void;
    onClose: () => void;
}

/**
 * Accessible dialog for staging files, previewing PDFs/images locally, and submitting exam materials.
 */
export function MaterialUploadModal({
    semesters,
    uploadForm,
    onChangeForm,
    stagedFiles,
    setStagedFiles,
    uploading,
    uploadError,
    setUploadError,
    onSubmit,
    onClose,
}: MaterialUploadModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewFileIdx, setPreviewFileIdx] = useState(0);
    const [previewLoading, setPreviewLoading] = useState(false);

    const uploadSubjects = Array.isArray(semesters)
        ? uploadForm.semesterId
            ? semesters.find((s) => s.id === uploadForm.semesterId)?.subjects ?? []
            : semesters.flatMap((s) => s.subjects)
        : [];

    const activePreviewItem = stagedFiles[previewFileIdx];

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-modal-title"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <div className="bg-card rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-border/50 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 id="upload-modal-title" className="text-xl font-bold">
                        Upload Material
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={uploading}
                        aria-label="Close upload dialog"
                        className="text-muted-foreground hover:text-foreground disabled:opacity-40"
                    >
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>

                {uploadError && (
                    <div
                        role="alert"
                        className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm"
                    >
                        <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                        <span>{uploadError}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <Label htmlFor="upload-title" className="text-sm">
                            Title <span className="text-red-400">*</span>{" "}
                            <span className="text-xs text-muted-foreground">
                                (leave blank to use filename)
                            </span>
                        </Label>
                        <Input
                            id="upload-title"
                            className="mt-1"
                            placeholder="e.g. MAE101 Final Exam 2024"
                            value={uploadForm.title}
                            onChange={(e) =>
                                onChangeForm((prev) => ({ ...prev, title: e.target.value }))
                            }
                        />
                    </div>
                    <div>
                        <Label htmlFor="upload-desc" className="text-sm">
                            Description (optional)
                        </Label>
                        <Input
                            id="upload-desc"
                            className="mt-1"
                            placeholder="Brief description..."
                            value={uploadForm.description}
                            onChange={(e) =>
                                onChangeForm((prev) => ({ ...prev, description: e.target.value }))
                            }
                        />
                    </div>
                    <div>
                        <Label htmlFor="upload-semester" className="text-sm">
                            Semester <span className="text-red-400">*</span>
                        </Label>
                        <select
                            id="upload-semester"
                            className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                            value={uploadForm.semesterId}
                            onChange={(e) =>
                                onChangeForm((prev) => ({
                                    ...prev,
                                    semesterId: e.target.value,
                                    subjectId: "",
                                }))
                            }
                        >
                            <option value="">Select Semester</option>
                            {semesters.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label htmlFor="upload-subject" className="text-sm">
                            Subject <span className="text-red-400">*</span>
                        </Label>
                        <select
                            id="upload-subject"
                            className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                            value={uploadForm.subjectId}
                            onChange={(e) =>
                                onChangeForm((prev) => ({ ...prev, subjectId: e.target.value }))
                            }
                        >
                            <option value="">Select Subject</option>
                            {uploadSubjects.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.code}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <Label className="text-sm">
                        Files <span className="text-red-400">*</span>{" "}
                        <span className="text-xs text-muted-foreground">(max 10MB each)</span>
                    </Label>
                    <div
                        role="button"
                        tabIndex={0}
                        aria-label="Choose files to upload"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                fileInputRef.current?.click();
                            }
                        }}
                        className={cn(
                            "mt-1 border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors",
                            stagedFiles.length
                                ? "border-primary/50 bg-primary/5"
                                : "border-border hover:border-primary/40 hover:bg-muted/20"
                        )}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            accept=".pdf,.docx,.doc,.pptx,.ppt,.zip,.png,.jpg,.jpeg"
                            onChange={(e) => {
                                const selected = Array.from(e.target.files ?? []);
                                e.target.value = "";
                                const oversized = selected.filter(
                                    (f) => f.size > MAX_CLIENT_FILE_BYTES
                                );
                                if (oversized.length > 0) {
                                    setUploadError(
                                        `File "${oversized[0].name}" exceeds the 10MB size limit.`
                                    );
                                    return;
                                }

                                const mapped: StagedUploadFile[] = selected.map((file) => {
                                    const needsPreview =
                                        ALLOWED_MIME_PREFIXES.includes(file.type) ||
                                        file.type === "application/pdf";
                                    return {
                                        id: crypto.randomUUID(),
                                        file,
                                        previewUrl: needsPreview
                                            ? URL.createObjectURL(file)
                                            : undefined,
                                        status: "pending",
                                    };
                                });

                                setUploadError("");
                                setStagedFiles((prev) => {
                                    const next = [...prev, ...mapped];
                                    if (prev.length === 0 && next.length > 0) {
                                        setPreviewFileIdx(0);
                                    }
                                    return next;
                                });
                            }}
                        />

                        {stagedFiles.length > 0 ? (
                            <div className="space-y-2 text-left max-h-48 overflow-y-auto">
                                {stagedFiles.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border/50"
                                    >
                                        {item.previewUrl &&
                                        ALLOWED_MIME_PREFIXES.includes(item.file.type) ? (
                                            <Image
                                                src={item.previewUrl}
                                                alt={item.file.name}
                                                width={40}
                                                height={40}
                                                unoptimized
                                                className="w-10 h-10 object-cover rounded shadow-sm"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 flex items-center justify-center bg-background rounded shadow-sm text-xs font-bold text-primary">
                                                {typeIcon(
                                                    item.file.name.split(".").pop() || "FILE"
                                                )}
                                            </div>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="truncate flex-1 font-medium">
                                                    {item.file.name}
                                                </span>
                                                <span className="text-xs text-muted-foreground shrink-0">
                                                    {formatSize(item.file.size)}
                                                </span>
                                            </div>
                                            <div className="text-xs flex items-center gap-2 mt-0.5">
                                                {item.status === "error" && (
                                                    <span className="text-red-400 flex items-center gap-1">
                                                        <X className="w-3 h-3" /> {item.error}
                                                    </span>
                                                )}
                                                {item.status === "done" && (
                                                    <span className="text-green-400">Uploaded</span>
                                                )}
                                                {item.status === "uploading" && (
                                                    <span className="text-primary">
                                                        Uploading...
                                                    </span>
                                                )}
                                                {!uploading && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (item.previewUrl) {
                                                                URL.revokeObjectURL(
                                                                    item.previewUrl
                                                                );
                                                            }
                                                            setStagedFiles((prev) => {
                                                                const next = prev.filter(
                                                                    (f) => f.id !== item.id
                                                                );
                                                                setPreviewFileIdx((idx) =>
                                                                    Math.max(
                                                                        0,
                                                                        Math.min(
                                                                            idx,
                                                                            next.length - 1
                                                                        )
                                                                    )
                                                                );
                                                                return next;
                                                            });
                                                        }}
                                                        className="text-red-400 hover:text-red-300 transition-colors"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div>
                                <Upload
                                    className="w-8 h-8 mx-auto text-muted-foreground mb-2"
                                    aria-hidden="true"
                                />
                                <p className="text-sm text-muted-foreground">
                                    Click to choose one or more files
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    PDF, DOCX, PPTX, ZIP, PNG, JPG · max 10MB each
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {activePreviewItem?.previewUrl && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm">Preview</Label>
                            {stagedFiles.length > 1 && (
                                <div className="flex gap-1">
                                    {stagedFiles.map((item, i) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                                setPreviewFileIdx(i);
                                                setPreviewLoading(true);
                                            }}
                                            className={cn(
                                                "px-2 py-0.5 text-xs rounded-md border transition-colors",
                                                previewFileIdx === i
                                                    ? "bg-primary text-primary-foreground border-primary"
                                                    : "border-border text-muted-foreground hover:border-primary/50"
                                            )}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="relative rounded-xl overflow-hidden border border-border/50 bg-muted/10">
                            {previewLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/40 z-10 gap-2">
                                    <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                    <span className="text-sm text-muted-foreground">
                                        Loading preview...
                                    </span>
                                </div>
                            )}
                            {activePreviewItem.file.type === "application/pdf" ? (
                                <iframe
                                    src={activePreviewItem.previewUrl}
                                    className="w-full h-[50vh]"
                                    title={activePreviewItem.file.name}
                                    onLoad={() => setPreviewLoading(false)}
                                />
                            ) : (
                                <Image
                                    src={activePreviewItem.previewUrl}
                                    alt={activePreviewItem.file.name}
                                    width={800}
                                    height={600}
                                    unoptimized
                                    className="w-auto max-w-full max-h-[50vh] h-auto mx-auto object-contain"
                                    onLoad={() => setPreviewLoading(false)}
                                />
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                            {activePreviewItem.file.name} ·{" "}
                            {formatSize(activePreviewItem.file.size)}
                        </p>
                    </div>
                )}

                <Button
                    className="w-full gap-2"
                    onClick={onSubmit}
                    disabled={uploading || !stagedFiles.length}
                >
                    {uploading ? (
                        <>
                            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Uploading {stagedFiles.length} file
                            {stagedFiles.length > 1 ? "s" : ""}...
                        </>
                    ) : (
                        <>
                            <Upload className="w-4 h-4" aria-hidden="true" /> Upload{" "}
                            {stagedFiles.length > 1 ? `${stagedFiles.length} Files` : "File"}
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
