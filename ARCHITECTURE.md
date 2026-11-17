# Architecture Overview

## Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript 5
- **Database:** PostgreSQL / Neon with Prisma ORM 6 (`prisma/schema.prisma`)
- **UI & Styling:** Tailwind CSS v4, Radix UI primitives, Lucide icons, Framer Motion, Recharts, React Big Calendar
- **Testing:** Vitest 4 dual-project runner (`vitest.config.mts`: Node environment for API/domain logic, jsdom for React UI tests)

## Directory Layout

- `src/app/` — App Router pages, layouts, error boundaries, and REST/streaming API route handlers under `src/app/api/**`.
- `src/components/ui/` — Accessible reusable UI primitives (`Button`, `Card`, `Dialog`, `Input`, `Label`, `Progress`, `Skeleton`, `Textarea`, `Toast`, `Alert`).
- `src/components/layout/` — Global navigation chrome (`Navbar`, `UserProfileDropdown`, `LanguageToggle`, `ProtectedRoute`).
- `src/components/features/` — Modular feature components:
  - `exam-materials/`: `MaterialCard`, `MaterialUploadModal`, `MaterialPreviewModal`, `material-helpers.ts`
  - `flashcards/`: `DeckList`, `DeckDetail`, `StudyMode`, `FlashcardListServer`, `FlashcardSkeleton`
  - `scheduler/`: `FixedEventsPanel`, `EverydayTasksPanel`, `IndividualTasksPanel`
  - `community/`: `CommunityPosts`, `CommunityFeed`, `PostItem`
  - `games/`: `BubblePopGame`, `ColorByNumberGame`, `AmbientGame`, composed by `StressGamesHub`
- `src/lib/` — Pure domain engines (`assessment-data.ts`, `chat/risk.ts`, `community/{moderation,queries}.ts`, `scheduler/algorithm.ts`, `it-support/{algorithms,binary}.ts`), security modules (`src/lib/security/*`), Zod schemas (`src/lib/validation/*`), API helpers (`src/lib/api/response.ts`), and providers (`auth-context.tsx`, `language-context.tsx`).
- `prisma/` — Prisma schema, SQL migration (`prisma/migrations/20260301000000_sync_full_schema_and_security`), and idempotent catalog seeder (`prisma/seed-subjects.ts`).
