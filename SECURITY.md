# Security Policy & Hardening Architecture

## Implemented Controls

- **Authentication & Session Integrity (`src/lib/session.ts`, `src/lib/security/password.ts`, `src/lib/security/crypto.ts`):**
  - Passwords hashed with `bcryptjs` (cost factor 12).
  - OTP verification codes (registration, password reset, email change) are hashed with HMAC-SHA256 (`hashOtp` / `verifyOtpHash` using `crypto.timingSafeEqual`) with capped retry attempts and short TTLs.
  - Session tokens are signed HS256 JWTs (`jose`) carrying `iss`, `aud`, `typ`, and `tokenVersion`. Every authenticated route (`requireAuth`) and SSR page verifies `user.tokenVersion` against the database so logout, password reset, password change, and email rotation immediately invalidate older tokens.
- **CSRF & Browser Hardening (`src/lib/security/csrf.ts`, `next.config.ts`):**
  - State-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) verify `Sec-Fetch-Site`, `Origin`, and `Referer` against expected host headers.
  - Global response headers configure `Content-Security-Policy` (`object-src 'none'`, `frame-ancestors 'self'`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Strict-Transport-Security`, and `Referrer-Policy`.
- **Ownership & Input Validation (`src/lib/validation/*`, `src/app/api/*`):**
  - All API JSON and query payloads are validated with strict Zod schemas.
  - Resource mutations enforce owner checks (`authorId`, `userId`, `uploadedById`) to prevent IDOR.
  - Rate limits (`guardRateLimit`) protect authentication, AI proxy, upload, and community write endpoints.
- **SSRF, Header Injection & Secret Isolation (`src/lib/security/headers.ts`, `/api/it-support/ai`, `/api/chat`):**
  - `isAllowedBlobUrl` restricts remote storage URLs to HTTPS Vercel Blob storage subdomains without embedded credentials.
  - `sanitizeFilename` and `buildContentDisposition` prevent path traversal and CRLF header smuggling.
  - `GEMINI_API_KEY`, `CHAT_API_KEY`, `JWT_SECRET`, `BLOB_READ_WRITE_TOKEN`, and SMTP credentials exist strictly on the server.
  - Client chat requests reject `"system"` role messages via `chatInputMessageSchema`.

## Credential Rotation Notice

Never commit `.env`, `.env.local`, or secret keys to version control. Use `.env.example` as a template and rotate any credentials that appeared in historical commits via your database, email, storage, and AI provider dashboards.
