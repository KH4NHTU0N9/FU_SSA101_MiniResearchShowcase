# Contributing Guidelines

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL database URL (for runtime APIs and migrations)

## Local Setup

1. Copy `.env.example` to `.env.local` and configure required server secrets.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Generate the Prisma client and apply schema/seeds when connected to Postgres:
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

## Required Verification Before Committing

All pull requests and commits must pass every quality gate cleanly:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Commit Style

Keep commits small, single-purpose, and descriptive (Conventional Commits format, e.g. `feat(...)`, `fix(...)`, `refactor(...)`, `test(...)`, `docs(...)`).
