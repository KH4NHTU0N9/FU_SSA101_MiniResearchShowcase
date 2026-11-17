"use client";

import Image from "next/image";
import { Download, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExamMaterialDTO } from "@/types";
import { formatSize } from "./material-helpers";

export interface MaterialPreviewModalProps {
    material: ExamMaterialDTO;
    onClose: () => void;
    onDownloadMaterial: (material: ExamMaterialDTO) => void;
    onDownloadFile: (url: string, filename: string, materialId: string) => void;
}

/**
 * Accessible lightbox modal rendering inline PDF/image previews or download fallback for study materials.
 */
export function MaterialPreviewModal({
    material,
    onClose,
    onDownloadMaterial,
    onDownloadFile,
}: MaterialPreviewModalProps) {
    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-modal-title"
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <div className="bg-card rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col border border-border/50">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div>
                        <h2 id="preview-modal-title" className="font-bold">
                            {material.title}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            {material.semester.name} · {material.subject.code} ·{" "}
                            {formatSize(material.size || 0)}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close preview"
                        className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/30 transition-colors"
                    >
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-4 space-y-4">
                    {material.files && material.files.length > 0 ? (
                        material.files.map((file) => (
                            <div key={file.id} className="w-full flex justify-center">
                                {file.type.toUpperCase() === "PDF" ? (
                                    <iframe
                                        src={`/api/exam-materials/file?fileId=${encodeURIComponent(file.id)}`}
                                        className="w-full h-[75vh] rounded"
                                        title={file.name}
                                    />
                                ) : ["PNG", "JPG", "JPEG"].includes(file.type.toUpperCase()) ? (
                                    <Image
                                        src={`/api/exam-materials/file?fileId=${encodeURIComponent(file.id)}`}
                                        alt={file.name}
                                        width={1200}
                                        height={900}
                                        unoptimized
                                        className="w-auto max-w-full h-auto rounded"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3 w-full bg-muted/20 rounded">
                                        <FileText className="w-12 h-12 opacity-30" aria-hidden="true" />
                                        <p>Preview not available for {file.type} files</p>
                                        <Button
                                            size="sm"
                                            onClick={() =>
                                                onDownloadFile(
                                                    `/api/exam-materials/file?fileId=${encodeURIComponent(file.id)}&download=1`,
                                                    file.name,
                                                    material.id
                                                )
                                            }
                                            className="gap-1"
                                        >
                                            <Download className="w-3 h-3" aria-hidden="true" />{" "}
                                            Download {file.name}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : material.type.toUpperCase() === "PDF" ? (
                        <iframe
                            src={`/api/exam-materials/file?id=${encodeURIComponent(material.id)}`}
                            className="w-full h-full min-h-[75vh] rounded"
                            title={material.title}
                        />
                    ) : ["PNG", "JPG", "JPEG"].includes(material.type.toUpperCase()) ? (
                        <Image
                            src={`/api/exam-materials/file?id=${encodeURIComponent(material.id)}`}
                            alt={material.title}
                            width={1200}
                            height={900}
                            unoptimized
                            className="w-auto max-w-full h-auto mx-auto rounded"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                            <FileText className="w-12 h-12 opacity-30" aria-hidden="true" />
                            <p>Preview not available for {material.type || "unknown"} files</p>
                            <Button
                                size="sm"
                                onClick={() => onDownloadMaterial(material)}
                                className="gap-1"
                            >
                                <Download className="w-3 h-3" aria-hidden="true" /> Download to view
                            </Button>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-border flex items-center justify-between gap-3 bg-card">
                    <p className="text-xs text-muted-foreground truncate">
                        {material.files && material.files.length > 1
                            ? `${material.files.length} files · click Download to save`
                            : material.type || ""}
                    </p>
                    <Button
                        onClick={() => onDownloadMaterial(material)}
                        className="gap-2 shrink-0"
                    >
                        <Download className="w-4 h-4" aria-hidden="true" /> Download
                    </Button>
                </div>
            </div>
        </div>
    );
}
