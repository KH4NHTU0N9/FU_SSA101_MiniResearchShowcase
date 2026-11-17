"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { upload } from "@vercel/blob/client";
import {
    AlertCircle,
    BookOpen,
    Copy,
    Download,
    Eye,
    FileText,
    Search,
    Share2,
    Trash2,
    Upload,
    X,
} from "lucide-react";
import ProtectedRoute from "@/components/layout/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import type { ExamMaterialDTO, ExamSemesterDTO } from "@/types";

interface StagedUploadFile {
    id: string;
    file: File;
    previewUrl?: string;
    uploadedBlob?: { url: string; name: string; size: number };
    status: "pending" | "uploading" | "done" | "error";
    error?: string;
}

const MAX_CLIENT_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ["image/png", "image/jpeg"];

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function typeIcon(type: string): string {
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

function revokeFilePreviews(items: StagedUploadFile[]): void {
    for (const item of items) {
        if (item.previewUrl) {
            URL.revokeObjectURL(item.previewUrl);
        }
    }
}

export default function ExamMaterialsPage() {
    return (
        <ProtectedRoute>
            <Suspense
                fallback={
                    <div className="min-h-screen flex items-center justify-center bg-background">
                        <p className="text-muted-foreground animate-pulse">Loading materials...</p>
                    </div>
                }
            >
                <ExamMaterialsContent />
            </Suspense>
        </ProtectedRoute>
    );
}

function ExamMaterialsContent() {
    const { user } = useAuth();
    const { showToast, confirmAction } = useToast();
    const searchParams = useSearchParams();
    const sharedMaterialId = searchParams.get("material");

    const [semesters, setSemesters] = useState<ExamSemesterDTO[]>([]);
    const [materials, setMaterials] = useState<ExamMaterialDTO[]>([]);
    const [total, setTotal] = useState(0);

    const [selectedSemesterId, setSelectedSemesterId] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Upload Modal
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadForm, setUploadForm] = useState({
        title: "",
        description: "",
        semesterId: "",
        subjectId: "",
    });
    const [stagedFiles, setStagedFiles] = useState<StagedUploadFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewFileIdx, setPreviewFileIdx] = useState(0);
    const [previewLoading, setPreviewLoading] = useState(false);

    // Preview Modal
    const [previewMaterial, setPreviewMaterial] = useState<ExamMaterialDTO | null>(null);
    const sharedHandledRef = useRef<string | null>(null);

    // Copied link toast
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const stagedFilesRef = useRef<StagedUploadFile[]>([]);
    stagedFilesRef.current = stagedFiles;

    useEffect(() => {
        const controller = new AbortController();
        fetch("/api/exam-materials/filters", { signal: controller.signal })
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => {
                if (Array.isArray(data)) {
                    setSemesters(data);
                }
            })
            .catch((err) => {
                if ((err as Error)?.name !== "AbortError") {
                    console.error("Failed to load exam material filters:", err);
                }
            });

        return () => {
            controller.abort();
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
            revokeFilePreviews(stagedFilesRef.current);
        };
    }, []);

    const fetchMaterials = useCallback(
        async (p: number, reset = false, signal?: AbortSignal) => {
            if (reset) setLoading(true);
            else setLoadingMore(true);

            try {
                const params = new URLSearchParams();
                if (selectedSemesterId) params.set("semesterId", selectedSemesterId);
                if (selectedSubjectId) params.set("subjectId", selectedSubjectId);
                if (search) params.set("search", search);
                params.set("page", String(p));

                const res = await fetch(`/api/exam-materials?${params}`, { signal });
                const data = (await res.json()) as {
                    materials?: ExamMaterialDTO[];
                    total?: number;
                };

                if (!res.ok || !Array.isArray(data.materials)) {
                    showToast("Failed to load materials.", "error");
                    return;
                }

                const loaded = data.materials;
                setMaterials((prev) => (reset ? loaded : [...prev, ...loaded]));
                setTotal(data.total ?? 0);
                setPage(p);
            } catch (err) {
                if ((err as Error)?.name !== "AbortError") {
                    showToast("Network error loading materials.", "error");
                }
            } finally {
                if (!signal?.aborted) {
                    setLoading(false);
                    setLoadingMore(false);
                }
            }
        },
        [selectedSemesterId, selectedSubjectId, search, showToast]
    );

    useEffect(() => {
        const controller = new AbortController();
        void fetchMaterials(1, true, controller.signal);
        return () => controller.abort();
    }, [fetchMaterials]);

    useEffect(() => {
        if (!sharedMaterialId || sharedHandledRef.current === sharedMaterialId || loading) {
            return;
        }
        const match = materials.find((m) => m.id === sharedMaterialId);
        if (match) {
            sharedHandledRef.current = sharedMaterialId;
            setPreviewMaterial(match);
        }
    }, [sharedMaterialId, materials, loading]);

    const closeUploadModal = useCallback(() => {
        if (uploading) return;
        revokeFilePreviews(stagedFilesRef.current);
        setStagedFiles([]);
        setUploadError("");
        setPreviewFileIdx(0);
        setPreviewLoading(false);
        setShowUploadModal(false);
    }, [uploading]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            if (previewMaterial) {
                setPreviewMaterial(null);
            } else if (showUploadModal) {
                closeUploadModal();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [previewMaterial, showUploadModal, closeUploadModal]);

    const availableSubjects = Array.isArray(semesters)
        ? selectedSemesterId
            ? semesters.find((s) => s.id === selectedSemesterId)?.subjects ?? []
            : semesters.flatMap((s) => s.subjects)
        : [];

    const uploadSubjects = Array.isArray(semesters)
        ? uploadForm.semesterId
            ? semesters.find((s) => s.id === uploadForm.semesterId)?.subjects ?? []
            : semesters.flatMap((s) => s.subjects)
        : [];

    function triggerDownload(url: string, filename: string, materialId: string) {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();

        setMaterials((prev) =>
            prev.map((m) =>
                m.id === materialId ? { ...m, totalDownloads: m.totalDownloads + 1 } : m
            )
        );
    }

    function handleDownload(material: ExamMaterialDTO) {
        triggerDownload(
            `/api/exam-materials/file?id=${encodeURIComponent(material.id)}&download=1`,
            material.title,
            material.id
        );
    }

    async function handleUpload() {
        if (!stagedFiles.length || !uploadForm.semesterId || !uploadForm.subjectId) {
            setUploadError("Please select at least one file and choose Semester + Subject.");
            return;
        }
        setUploading(true);
        setUploadError("");

        const updated = [...stagedFiles];
        let anyFailed = false;

        try {
            for (let i = 0; i < updated.length; i++) {
                const item = updated[i];
                if (item.uploadedBlob) continue;

                updated[i] = { ...item, status: "uploading", error: undefined };
                setStagedFiles([...updated]);

                try {
                    const blob = await upload(`exam-materials/${item.file.name}`, item.file, {
                        access: "public",
                        handleUploadUrl: "/api/exam-materials/upload",
                    });
                    updated[i] = {
                        ...item,
                        status: "done",
                        uploadedBlob: {
                            url: blob.url,
                            name: item.file.name,
                            size: item.file.size,
                        },
                    };
                    setStagedFiles([...updated]);
                } catch (err) {
                    anyFailed = true;
                    const msg = err instanceof Error ? err.message : "Upload failed";
                    updated[i] = { ...item, status: "error", error: msg };
                    setStagedFiles([...updated]);
                }
            }

            if (anyFailed || updated.some((f) => !f.uploadedBlob)) {
                setUploadError("Some files failed to upload. Remove failed files or retry before saving.");
                return;
            }

            const uploadedResults = updated
                .map((f) => f.uploadedBlob)
                .filter((b): b is NonNullable<typeof b> => Boolean(b));

            const form = new FormData();
            form.append(
                "title",
                uploadForm.title.trim() || updated[0].file.name.replace(/\.[^.]+$/, "")
            );
            form.append("description", uploadForm.description.trim());
            form.append("semesterId", uploadForm.semesterId);
            form.append("subjectId", uploadForm.subjectId);
            form.append("uploadedFiles", JSON.stringify(uploadedResults));

            const res = await fetch("/api/exam-materials", { method: "POST", body: form });
            const data = (await res.json().catch(() => ({}))) as { error?: string };

            if (!res.ok) {
                setUploadError(data.error || `Failed to save material (${res.status}).`);
                return;
            }

            revokeFilePreviews(updated);
            setStagedFiles([]);
            setUploadForm({ title: "", description: "", semesterId: "", subjectId: "" });
            setShowUploadModal(false);
            showToast("Material uploaded successfully.", "success");
            void fetchMaterials(1, true);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Network error during upload";
            setUploadError(msg);
        } finally {
            setUploading(false);
        }
    }

    async function copyShareLink(material: ExamMaterialDTO) {
        const url = `${window.location.origin}/exam-materials?material=${encodeURIComponent(material.id)}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopiedId(material.id);
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
            copyTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
            showToast("Share link copied to clipboard.", "success");
        } catch {
            showToast("Could not access clipboard. Copy the URL from the address bar.", "error");
        }
    }

    async function handleDelete(material: ExamMaterialDTO) {
        const confirmed = await confirmAction({
            title: `Delete "${material.title}"?`,
            description: "This study material and its attached files will be permanently removed.",
            confirmLabel: "Delete",
            cancelLabel: "Cancel",
            destructive: true,
        });
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/exam-materials/${encodeURIComponent(material.id)}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setMaterials((prev) => prev.filter((m) => m.id !== material.id));
                setTotal((t) => Math.max(0, t - 1));
                showToast("Material deleted.", "success");
            } else {
                const data = (await res.json().catch(() => ({}))) as { error?: string };
                showToast(data.error || "Failed to delete material.", "error");
            }
        } catch {
            showToast("Network error while deleting material.", "error");
        }
    }

    const activePreviewItem = stagedFiles[previewFileIdx];

    return (
        <div className="min-h-screen bg-background w-full overflow-x-hidden">
            <div className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="w-full max-w-[1400px] mx-auto px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <BookOpen className="w-6 h-6 text-primary" aria-hidden="true" />
                            Exam Materials
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Share and download study resources
                        </p>
                    </div>
                    <Button
                        onClick={() => setShowUploadModal(true)}
                        className="bg-primary gap-2 self-start sm:self-auto"
                    >
                        <Upload className="w-4 h-4" aria-hidden="true" /> Upload Material
                    </Button>
                </div>
            </div>

            <div className="w-full max-w-[1400px] mx-auto px-6 py-4">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        setSearch(searchInput.trim());
                    }}
                    className="glass-card p-4 rounded-xl flex flex-wrap gap-3 items-end"
                >
                    <div className="flex-1 min-w-[200px] space-y-1">
                        <Label htmlFor="materials-search" className="text-xs text-muted-foreground">
                            Search
                        </Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <Input
                                    id="materials-search"
                                    className="pl-9"
                                    placeholder="Search by title, subject code, or semester..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                />
                            </div>
                            <Button type="submit" variant="secondary">
                                Search
                            </Button>
                        </div>
                    </div>

                    <div className="min-w-[160px] space-y-1">
                        <Label htmlFor="materials-semester" className="text-xs text-muted-foreground">
                            Semester
                        </Label>
                        <select
                            id="materials-semester"
                            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                            value={selectedSemesterId}
                            onChange={(e) => {
                                setSelectedSemesterId(e.target.value);
                                setSelectedSubjectId("");
                            }}
                        >
                            <option value="">All Semesters</option>
                            {semesters.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="min-w-[160px] space-y-1">
                        <Label htmlFor="materials-subject" className="text-xs text-muted-foreground">
                            Subject
                        </Label>
                        <select
                            id="materials-subject"
                            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                            value={selectedSubjectId}
                            onChange={(e) => setSelectedSubjectId(e.target.value)}
                        >
                            <option value="">All Subjects</option>
                            {availableSubjects.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.code}
                                </option>
                            ))}
                        </select>
                    </div>

                    {(selectedSemesterId || selectedSubjectId || search) && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-muted-foreground"
                            onClick={() => {
                                setSelectedSemesterId("");
                                setSelectedSubjectId("");
                                setSearch("");
                                setSearchInput("");
                            }}
                        >
                            <X className="w-3 h-3" aria-hidden="true" /> Clear
                        </Button>
                    )}
                </form>
            </div>

            <div className="w-full max-w-[1400px] mx-auto px-6 pb-12">
                <p className="text-sm text-muted-foreground mb-4">
                    {loading ? "Loading..." : `${total} material${total !== 1 ? "s" : ""} found`}
                </p>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-48 rounded-xl bg-muted/30 animate-pulse" />
                        ))}
                    </div>
                ) : materials.length === 0 ? (
                    <div className="text-center py-24 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" aria-hidden="true" />
                        <p className="text-lg font-medium">No materials found</p>
                        <p className="text-sm mt-1">
                            Current catalog has <b>{semesters.length} Semesters</b> and{" "}
                            <b>
                                {semesters.reduce((acc, s) => acc + (s.subjects?.length || 0), 0)}{" "}
                                Subjects
                            </b>{" "}
                            ready for use.
                        </p>
                        <p className="text-xs mt-2 opacity-60">
                            Try adjusting your filters or upload the first study material!
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {materials.map((m) => (
                                <MaterialCard
                                    key={m.id}
                                    material={m}
                                    onDownload={() => handleDownload(m)}
                                    onPreview={() => setPreviewMaterial(m)}
                                    onShare={() => void copyShareLink(m)}
                                    onDelete={() => void handleDelete(m)}
                                    copied={copiedId === m.id}
                                    isOwn={user?.id === m.uploadedBy.id}
                                />
                            ))}
                        </div>

                        {materials.length < total && (
                            <div className="text-center mt-8">
                                <Button
                                    variant="outline"
                                    onClick={() => void fetchMaterials(page + 1)}
                                    disabled={loadingMore}
                                >
                                    {loadingMore ? "Loading..." : "Load More"}
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {showUploadModal && (
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
                                onClick={closeUploadModal}
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
                                        setUploadForm({ ...uploadForm, title: e.target.value })
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
                                        setUploadForm({ ...uploadForm, description: e.target.value })
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
                                        setUploadForm({
                                            ...uploadForm,
                                            semesterId: e.target.value,
                                            subjectId: "",
                                        })
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
                                        setUploadForm({ ...uploadForm, subjectId: e.target.value })
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
                                                            <span className="text-green-400">
                                                                Uploaded
                                                            </span>
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
                            onClick={() => void handleUpload()}
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
                                    {stagedFiles.length > 1
                                        ? `${stagedFiles.length} Files`
                                        : "File"}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {previewMaterial && (
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
                                    {previewMaterial.title}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {previewMaterial.semester.name} · {previewMaterial.subject.code}{" "}
                                    · {formatSize(previewMaterial.size || 0)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewMaterial(null)}
                                aria-label="Close preview"
                                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted/30 transition-colors"
                            >
                                <X className="w-5 h-5" aria-hidden="true" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-4 space-y-4">
                            {previewMaterial.files && previewMaterial.files.length > 0 ? (
                                previewMaterial.files.map((file) => (
                                    <div key={file.id} className="w-full flex justify-center">
                                        {file.type.toUpperCase() === "PDF" ? (
                                            <iframe
                                                src={`/api/exam-materials/file?fileId=${encodeURIComponent(file.id)}`}
                                                className="w-full h-[75vh] rounded"
                                                title={file.name}
                                            />
                                        ) : ["PNG", "JPG", "JPEG"].includes(
                                              file.type.toUpperCase()
                                          ) ? (
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
                                                        triggerDownload(
                                                            `/api/exam-materials/file?fileId=${encodeURIComponent(file.id)}&download=1`,
                                                            file.name,
                                                            previewMaterial.id
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
                            ) : previewMaterial.type.toUpperCase() === "PDF" ? (
                                <iframe
                                    src={`/api/exam-materials/file?id=${encodeURIComponent(previewMaterial.id)}`}
                                    className="w-full h-full min-h-[75vh] rounded"
                                    title={previewMaterial.title}
                                />
                            ) : ["PNG", "JPG", "JPEG"].includes(
                                  previewMaterial.type.toUpperCase()
                              ) ? (
                                <Image
                                    src={`/api/exam-materials/file?id=${encodeURIComponent(previewMaterial.id)}`}
                                    alt={previewMaterial.title}
                                    width={1200}
                                    height={900}
                                    unoptimized
                                    className="w-auto max-w-full h-auto mx-auto rounded"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                                    <FileText className="w-12 h-12 opacity-30" aria-hidden="true" />
                                    <p>
                                        Preview not available for{" "}
                                        {previewMaterial.type || "unknown"} files
                                    </p>
                                    <Button
                                        size="sm"
                                        onClick={() => handleDownload(previewMaterial)}
                                        className="gap-1"
                                    >
                                        <Download className="w-3 h-3" aria-hidden="true" /> Download
                                        to view
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-border flex items-center justify-between gap-3 bg-card">
                            <p className="text-xs text-muted-foreground truncate">
                                {previewMaterial.files && previewMaterial.files.length > 1
                                    ? `${previewMaterial.files.length} files · click Download to save`
                                    : previewMaterial.type || ""}
                            </p>
                            <Button
                                onClick={() => handleDownload(previewMaterial)}
                                className="gap-2 shrink-0"
                            >
                                <Download className="w-4 h-4" aria-hidden="true" /> Download
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MaterialCard({
    material,
    onDownload,
    onPreview,
    onShare,
    onDelete,
    copied,
    isOwn,
}: {
    material: ExamMaterialDTO;
    onDownload: () => void;
    onPreview: () => void;
    onShare: () => void;
    onDelete: () => void;
    copied: boolean;
    isOwn: boolean;
}) {
    return (
        <div className="glass-card rounded-xl p-4 flex flex-col justify-between gap-2.5 hover:border-primary/30 transition-colors min-h-[220px]">
            <div className="space-y-2.5">
                <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                        {typeIcon(material.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                            {material.title}
                        </h3>
                        {material.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {material.description}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-[10px] font-medium">
                        {material.semester.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-medium">
                        {material.subject.code}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">
                        {material.type}
                    </span>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{formatSize(material.size)}</span>
                    <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" aria-hidden="true" />{" "}
                        {material.totalDownloads}
                    </span>
                    <span>by {material.uploadedBy.name || "Anonymous"}</span>
                </div>

                <div className="flex gap-1.5 pt-1 border-t border-border/50">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 gap-1 text-xs"
                        onClick={onPreview}
                    >
                        <Eye className="w-3 h-3" aria-hidden="true" /> Preview
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 gap-1 text-xs"
                        onClick={onDownload}
                    >
                        <Download className="w-3 h-3" aria-hidden="true" /> Download
                    </Button>
                    <button
                        type="button"
                        onClick={onShare}
                        aria-label={`Copy share link for ${material.title}`}
                        className="p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Copy link"
                    >
                        {copied ? (
                            <Copy className="w-3.5 h-3.5 text-green-400" aria-hidden="true" />
                        ) : (
                            <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                    </button>
                    {isOwn && (
                        <button
                            type="button"
                            onClick={onDelete}
                            aria-label={`Delete ${material.title}`}
                            className="p-2 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
