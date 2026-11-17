interface BuildRequestOptions {
    method?: string;
    body?: unknown;
    origin?: string | null;
    host?: string;
    ip?: string;
    headers?: Record<string, string>;
}

/**
 * Builds a Web API Request suited for testing Next.js App Router route handlers.
 */
export function buildJsonRequest(
    url: string,
    options: BuildRequestOptions = {}
): Request {
    const {
        method = "POST",
        body,
        origin = "http://localhost:3000",
        host = "localhost:3000",
        ip = "203.0.113.10",
        headers = {},
    } = options;

    const mergedHeaders = new Headers({
        "Content-Type": "application/json",
        Host: host,
        "x-forwarded-for": ip,
        ...headers,
    });

    if (origin !== null) {
        mergedHeaders.set("Origin", origin);
    }

    return new Request(url, {
        method,
        headers: mergedHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
}

/**
 * Builds a raw text/multipart/non-JSON Request for edge-case route testing.
 */
export function buildRawRequest(
    url: string,
    options: {
        method?: string;
        rawBody?: string | FormData;
        origin?: string | null;
        host?: string;
        ip?: string;
        headers?: Record<string, string>;
    } = {}
): Request {
    const {
        method = "POST",
        rawBody,
        origin = "http://localhost:3000",
        host = "localhost:3000",
        ip = "203.0.113.11",
        headers = {},
    } = options;

    const mergedHeaders = new Headers({
        Host: host,
        "x-forwarded-for": ip,
        ...headers,
    });
    if (origin !== null) {
        mergedHeaders.set("Origin", origin);
    }

    return new Request(url, {
        method,
        headers: mergedHeaders,
        body: rawBody,
    });
}
