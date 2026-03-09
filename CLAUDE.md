# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TheStockie** - an advanced stock analysis tool with AI-powered insights. Provides comprehensive financial data analysis including stock quotes, fundamentals, screening, earnings calendars, and blog content. Licensed under GNU AGPL v3.

## Architecture

### Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS 3, Radix UI / shadcn/ui
- **Backend**: tRPC 11 for type-safe APIs, Convex for database & backend functions
- **Authentication**: NextAuth 5 (beta) with Discord & Google OAuth, custom Convex adapter
- **State Management**: Jotai (global state with localStorage), React Query (server state), React Hook Form + Zod (forms)
- **Data Sources**: Financial Modeling Prep (FMP) API (primary), OpenBB (legacy, being replaced)
- **Content**: MDX blog posts via next-mdx-remote 6, gray-matter
- **Charts**: Recharts 2
- **Deployment**: Vercel with analytics

### Key Directories

- `convex/` - Convex backend: schema (`schema.ts`), queries/mutations (`posts.ts`, `auth.ts`), auto-generated types (`_generated/`)
- `src/app/` - Next.js App Router pages and API routes
- `src/server/api/routers/` - tRPC routers (`assets.ts` for financial data, `post.ts` for stock analysis)
- `src/server/api/schema/` - Zod schemas for external API responses (FMP/, OpenBB)
- `src/server/auth/` - NextAuth config (`config.ts`) + custom Convex adapter (`convex-adapter.ts`)
- `src/components/features/` - Domain-specific components (charts, screener, earnings, blog, etc.)
- `src/components/ui/` - Reusable shadcn/ui components (~50 components)
- `src/hooks/` - Custom React hooks (`use-symbol.ts`, `use-debounce.ts`, `use-mobile.tsx`, etc.)
- `src/lib/` - Utilities (`utils.ts`, `blog.ts`, `jsonToCSV.ts`)
- `src/trpc/` - tRPC client setup & React Query bindings

### Database (Convex)

Schema in `convex/schema.ts`. Tables: `users`, `accounts`, `sessions`, `posts`, `verificationTokens`.

- **posts** - Stock analysis data: `supabaseId` (ticker symbol), `prompt`, `response` (markdown), `recommendation` (strong_buy/buy/hold/sell), `marketCap`, `sector`, timestamps
- Indexes on: supabaseId, createdBy, recommendation, sector, createdAt
- Queries/mutations in `convex/posts.ts` and `convex/auth.ts`
- Custom NextAuth adapter in `src/server/auth/convex-adapter.ts`

### API Architecture

tRPC routers in `src/server/api/routers/`:

- **assetsRouter** (`assets.ts`) - All financial data from FMP API: quotes, search, screener, historical prices, fundamentals (balance sheet, cash flow, EPS, metrics, multiples), news, earnings calendar
- **postRouter** (`post.ts`) - Stock analysis CRUD via Convex: `getBySymbol`, `getLatest`, `getAll` (paginated with filters: symbol, sector, recommendation, marketCap range)

Context in `src/server/api/trpc.ts`: Convex HTTP client, NextAuth session, origin validation (localhost + thestockie.com), 5-min stale-while-revalidate caching. Timing middleware with artificial delay in dev.

## Common Commands

### Development

- `pnpm dev` - Start Next.js dev server (Turbo)
- `npx convex dev` - Start Convex dev server (run alongside `pnpm dev`)
- `pnpm build` - Production build
- `pnpm preview` - Build and start production server

### Code Quality

- `pnpm check` - Run both lint and typecheck (use before committing)
- `pnpm lint` / `pnpm lint:fix` - ESLint
- `pnpm typecheck` - TypeScript type checking (`tsc --noEmit`)
- `pnpm format:check` / `pnpm format:write` - Prettier (with Tailwind class sorting)

### Package Management

- Uses **pnpm** as package manager
- Path alias: `~/*` maps to `./src/*`

## Environment Variables

Key variables (see `.env.example`):

- `CONVEX_URL` / `NEXT_PUBLIC_CONVEX_URL` - Convex deployment URL
- `FMP_API_KEY` - Financial Modeling Prep API key
- `AUTH_SECRET` - NextAuth secret (required in prod)
- `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET` - Discord OAuth
- `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET` - Google OAuth
- `OPENBB_AUTH_TOKEN` - OpenBB API (legacy)

## Key Patterns

### Data Flow

1. Components use tRPC hooks (e.g., `api.asset.equityQuote.useQuery()`)
2. tRPC routers fetch from FMP API or Convex
3. Zod schemas in `src/server/api/schema/` validate external API responses
4. Data rendered with loading skeletons and error states

### State Management

- **Global symbol**: `useSymbol` hook (Jotai `atomWithStorage`) persists selected ticker across pages, syncs with URL. Default: "AAPL"
- **Server state**: React Query via tRPC hooks with automatic caching
- **URL state**: Screener page syncs all filters to URL params for deep linking
- **Forms**: React Hook Form + Zod validation

### Component Conventions

- Feature components in `src/components/features/` - "use client", domain-specific
- UI components in `src/components/ui/` - shadcn/ui primitives, no business logic
- Mobile-first responsive design with Tailwind breakpoints (md = 768px)
- Dark theme: navy background (`bg-[#15162c]`), CSS variable theming
- Debounced text inputs (500ms) to prevent excessive API calls
- Skeleton components for all loading states

### Pages

- `/` - Dashboard with stock search, charts, fundamentals grid
- `/screener` - Stock screener with filtering, pagination, URL state
- `/blogs` / `/blogs/[slug]` - MDX blog posts with tag filtering
- `/earnings` - Earnings calendar

## Quality Checks

Always run `pnpm check` (lint + typecheck) before committing. No formal test framework is configured. Strict TypeScript with ESLint Next.js rules.

## Notes

- ESLint config (`.eslintrc.cjs`) still references drizzle plugin rules from pre-migration - can be cleaned up
- OpenBB endpoints being gradually replaced with FMP
- Convex posts filtering happens in-memory in `convex/posts.ts`
