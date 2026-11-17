const ALLOWED_BLOB_HOST_SUFFIXES = [
    ".public.blob.vercel-storage.com",
    ".blob.vercel-storage.com",
];

/**
 * Strips path traversal, control characters, quotes, and CRLF sequences for Content-Disposition safety.
 */
export function sanitizeFilename(rawName: string, fallback = "download"): string {
    const baseName = rawName.split(/[\\/]/).pop() ?? "";
    const cleaned = baseName
        .replace(/[\r\n\0-\x1f\x7f"\\]/g, "_")
        .trim();
    return cleaned || fallback;
}

/**
 * Formats an RFC 5987 safe Content-Disposition header value.
 */
export function buildContentDisposition(disposition: "inline" | "attachment", rawFilename: string): string {
    const safeUtf8 = sanitizeFilename(rawFilename);
    const asciiFallback = safeUtf8.replace(/[^\x20-\x7e]/g, "_") || "download";
    const encodedUtf8 = encodeURIComponent(safeUtf8).replace(/['()*]/g, (c) =>
        `%${c.charCodeAt(0).toString(16).toUpperCase()}`
    );
    return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encodedUtf8}`;
}

/**
 * Validates that a remote storage URL uses HTTPS and points exclusively to Vercel Blob storage hosts (SSRF guard).
 */
export function isAllowedBlobUrl(rawUrl: string): boolean {
    try {
        const parsed = new URL(rawUrl);
        if (parsed.protocol !== "https:") return false;
        if (parsed.username || parsed.password) return false;

        const host = parsed.hostname.toLowerCase();
        if (host === "public.blob.vercel-storage.com") return false;
        return ALLOWED_BLOB_HOST_SUFFIXES.some(
            (suffix) => host.endsWith(suffix) && host.length > suffix.length
        );
    } catch {
        return false;
    }
}
