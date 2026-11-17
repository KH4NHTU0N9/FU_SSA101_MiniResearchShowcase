"use client";

import { Copy, Download, Eye, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExamMaterialDTO } from "@/types";
import { formatSize, typeIcon } from "./material-helpers";

export interface MaterialCardProps {
    material: ExamMaterialDTO;
    onDownload: () => void;
    onPreview: () => void;
    onShare: () => void;
    onDelete: () => void;
    copied: boolean;
    isOwn: boolean;
}

/**
 * Renders an individual exam material summary card with preview, download, share, and owner delete controls.
 */
export function MaterialCard({
    material,
    onDownload,
    onPreview,
    onShare,
    onDelete,
    copied,
    isOwn,
}: MaterialCardProps) {
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
