const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function normalizeHost(rawUrlOrHost: string | null): string | null {
    if (!rawUrlOrHost) return null;
    try {
        if (rawUrlOrHost.includes("://")) {
            return new URL(rawUrlOrHost).host.toLowerCase();
        }
        return rawUrlOrHost.split(",")[0]?.trim().toLowerCase() || null;
    } catch {
        return null;
    }
}

/**
 * Verifies same-origin guarantees on state-changing HTTP requests using Fetch Metadata and Origin/Referer headers.
 */
export function validateOrigin(req: Request): boolean {
    if (SAFE_METHODS.has(req.method.toUpperCase())) {
        return true;
    }

    const fetchSite = req.headers.get("sec-fetch-site")?.toLowerCase();
    if (fetchSite === "cross-site") {
        return false;
    }

    const expectedHosts = new Set<string>();
    const forwardedHost = normalizeHost(req.headers.get("x-forwarded-host"));
    const headerHost = normalizeHost(req.headers.get("host"));
    const appUrlHost = normalizeHost(process.env.NEXT_PUBLIC_APP_URL ?? null);

    if (forwardedHost) expectedHosts.add(forwardedHost);
    if (headerHost) expectedHosts.add(headerHost);
    if (appUrlHost) expectedHosts.add(appUrlHost);

    // Fallback to request URL host when running in tests without explicit Host headers.
    try {
        const reqHost = new URL(req.url).host.toLowerCase();
        if (reqHost) expectedHosts.add(reqHost);
    } catch {
        // Ignore unparseable relative URLs.
    }

    const originHeader = req.headers.get("origin");
    if (originHeader) {
        if (originHeader === "null") return false;
        const originHost = normalizeHost(originHeader);
        return !!originHost && expectedHosts.has(originHost);
    }

    const refererHeader = req.headers.get("referer");
    if (refererHeader) {
        const refererHost = normalizeHost(refererHeader);
        return !!refererHost && expectedHosts.has(refererHost);
    }

    // Allow non-browser / same-origin test invocations that omit Origin and Referer unless sec-fetch-site blocked it.
    return true;
}
