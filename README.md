# FPT Psychology Support & Study Hub (`FU_SSA101`)

A full-stack Next.js 16 student wellness and academic support platform featuring DASS-21 self-assessments, mood/energy tracking, bilingual EN/VN support, an AI support companion, anonymous peer community board, exam materials library with Vercel Blob storage, flashcard study studio, smart weekly scheduler, relaxation toolkit, and interactive CompArch Lab.

## Quick Start

```bash
cp .env.example .env.local
# Fill in DATABASE_URL, JWT_SECRET (>=32 chars), SMTP_*, CHAT_API_KEY, GEMINI_API_KEY, BLOB_READ_WRITE_TOKEN

npm install
npx prisma generate
npm run dev
```

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build production application |
| `npm start` | Serve production build |
| `npm run typecheck` | Run TypeScript (`tsc --noEmit`) |
| `npm run lint` | Run ESLint across workspace |
| `npm test` | Run full Vitest unit, API, E2E, security, and UI test suites |

## Further Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Application modules, domain logic, and database models
- [SECURITY.md](./SECURITY.md) — Authentication, CSRF, SSRF, CSP, and rate-limiting guarantees
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Development setup and quality checks
