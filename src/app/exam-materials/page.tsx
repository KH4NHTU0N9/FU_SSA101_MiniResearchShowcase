"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { BookOpen, FileText, Search, Upload, X } from "lucide-react";
import ProtectedRoute from "@/components/layout/protected-route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth-context";
import { MaterialCard } from "@/components/features/exam-materials/material-card";
import {
    revokeFilePreviews,
    type StagedUploadFile,
} from "@/components/features/exam-materials/material-helpers";
import { MaterialPreviewModal } from "@/components/features/exam-materials/material-preview-modal";
import {
    MaterialUploadModal,
    type UploadMaterialFormState,
} from "@/components/features/exam-materials/material-upload-modal";
import type { ExamMaterialDTO, ExamSemesterDTO } from "@/types";

const INITIAL_UPLOAD_FORM: UploadMaterialFormState = {
    title: "",
    description: "",
    semesterId: "",
    subjectId: "",
};

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

    // Upload Modal state
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadForm, setUploadForm] = useState<UploadMaterialFormState>(INITIAL_UPLOAD_FORM);
    const [stagedFiles, setStagedFiles] = useState<StagedUploadFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");

    // Preview & sharing state
    const [previewMaterial, setPreviewMaterial] = useState<ExamMaterialDTO | null>(null);
    const sharedHandledRef = useRef<string | null>(null);
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
            setUploadForm(INITIAL_UPLOAD_FORM);
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
                <MaterialUploadModal
                    semesters={semesters}
                    uploadForm={uploadForm}
                    onChangeForm={setUploadForm}
                    stagedFiles={stagedFiles}
                    setStagedFiles={setStagedFiles}
                    uploading={uploading}
                    uploadError={uploadError}
                    setUploadError={setUploadError}
                    onSubmit={() => void handleUpload()}
                    onClose={closeUploadModal}
                />
            )}

            {previewMaterial && (
                <MaterialPreviewModal
                    material={previewMaterial}
                    onClose={() => setPreviewMaterial(null)}
                    onDownloadMaterial={handleDownload}
                    onDownloadFile={triggerDownload}
                />
            )}
        </div>
    );
}
