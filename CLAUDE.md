# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "thestockie" - an advanced stock analysis tool with AI-powered insights built with Next.js 15, tRPC, Drizzle ORM, and PostgreSQL. The application provides comprehensive financial data analysis, including stock quotes, fundamentals, screening, and news.

## Architecture

### Tech Stack
- **Frontend**: Next.js 15 with React 19, Tailwind CSS, Radix UI components
- **Backend**: tRPC for type-safe APIs, NextAuth for authentication
- **Database**: PostgreSQL with Drizzle ORM
- **State Management**: Jotai for global state, React Hook Form for forms
- **Data Sources**: Financial Modeling Prep (FMP) API and OpenBB API integration
- **Deployment**: Vercel with analytics integration

### Key Directories
- `src/app/` - Next.js App Router pages and API routes
- `src/components/features/` - Domain-specific components (charts, metrics, search)
- `src/components/ui/` - Reusable UI components (shadcn/ui)
- `src/server/api/` - tRPC routers and database logic
- `src/server/api/schema/` - TypeScript schemas for external API responses
- `src/hooks/` - Custom React hooks
- `drizzle/` - Database migrations and snapshots

### API Architecture
The application uses tRPC for type-safe API communication:
- `assetsRouter` in `src/server/api/routers/assets.ts` handles all financial data endpoints
- External APIs: OpenBB (https://openbb.thestockie.com) and Financial Modeling Prep
- Environment variables: `OPENBB_AUTH_TOKEN`, `FMP_API_KEY`, `DATABASE_URL`

## Common Commands

### Development
- `pnpm dev` - Start development server with Turbo
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm preview` - Build and start production server

### Code Quality
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint issues automatically
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm check` - Run both lint and typecheck
- `pnpm format:check` - Check Prettier formatting
- `pnpm format:write` - Format code with Prettier

### Database
- `pnpm db:generate` - Generate Drizzle migrations
- `pnpm db:migrate` - Run database migrations
- `pnpm db:push` - Push schema changes to database
- `pnpm db:studio` - Open Drizzle Studio
- `./start-database.sh` - Start local PostgreSQL container

### Package Management
- Uses `pnpm` as package manager
- Lock file: `pnpm-lock.yaml`

## Environment Setup

1. Copy `.env.example` to `.env` and configure:
   - `DATABASE_URL` - PostgreSQL connection string
   - `OPENBB_AUTH_TOKEN` - OpenBB API authentication
   - `FMP_API_KEY` - Financial Modeling Prep API key
   - `NEXTAUTH_SECRET` - NextAuth secret for sessions

2. Start database: `./start-database.sh`
3. Run migrations: `pnpm db:push`
4. Start development: `pnpm dev`

## Key Patterns

### API Data Flow
1. Components use tRPC hooks (e.g., `api.asset.equityQuote.useQuery()`)
2. tRPC routers in `src/server/api/routers/` fetch from external APIs
3. Response schemas in `src/server/api/schema/` ensure type safety
4. Data flows through React components with proper loading/error states

### Component Organization
- Feature components in `src/components/features/` handle specific financial data
- UI components in `src/components/ui/` are generic, reusable components
- Custom hooks in `src/hooks/` manage state and side effects
- Global styles in `src/styles/globals.css` with Tailwind configuration

## Database Schema

Located in `src/server/db/schema.ts` with Drizzle ORM. Table prefix: `thestockie_*`

## Stock Screener Feature

### Overview
The screener page (`/screener`) provides advanced filtering and searching capabilities for stocks in the database. It includes comprehensive filtering, pagination, URL state management, and navigation to detailed stock analysis.

### Key Files
- `src/app/screener/page.tsx` - Main screener page component
- `src/components/features/screener-filters.tsx` - Filter component (collapsible on mobile)
- `src/components/features/screener-table.tsx` - Data table with action buttons
- `src/components/features/table-skeleton.tsx` - Loading skeleton for table
- `src/components/features/pagination.tsx` - Responsive pagination component
- `src/components/features/stock-response-modal.tsx` - Modal for viewing analysis reports
- `src/server/api/routers/post.ts` - Backend API with `getAll` endpoint

### Database Schema (Posts Table)
The posts table (`thestockie_post`) stores stock analysis data:
- `id` (VARCHAR) - Stock symbol (e.g., "AAPL") - Primary Key
- `prompt` (TEXT) - Analysis prompt used for generating recommendations
- `response` (TEXT) - AI-generated analysis report in markdown format
- `sector` (VARCHAR) - Stock sector (e.g., "TECHNOLOGY", "FINANCIALS")
- `recommendation` (VARCHAR) - Enum: "strong_buy", "buy", "hold", "sell"
- `market_cap` (INTEGER) - Market capitalization in dollars
- `created_by` (VARCHAR) - User ID who created the analysis
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

### API Endpoints

#### `api.post.getAll.useQuery(filters)`
Server-side paginated query with filtering support:
- **Filters**: symbol, sector, recommendation, marketCapMin, marketCapMax, page, limit
- **Returns**: `{ data: Stock[], pagination: { page, limit, total, totalPages, hasNext, hasPrev } }`
- **Features**: Debounced queries (500ms), exact symbol matching, range filtering

### Component Architecture

#### ScreenerFilters
- **Responsive design**: Desktop grid layout, mobile collapsible
- **Active state indicator**: Shows "Active" badge when filters are applied
- **Debounced inputs**: Symbol and market cap inputs use 500ms debouncing
- **Filter types**:
  - Symbol: Text input with auto-uppercase
  - Sector: Dropdown with predefined options
  - Recommendation: Dropdown with enum values
  - Market Cap: Min/max numeric inputs
  - Clear button: Resets all filters and URL

#### ScreenerTable
- **Sticky header**: Header remains visible during scroll
- **Fixed height**: `max-h-[calc(100vh-300px)]` with scroll
- **Action column**: Arrow button navigates to home page with auto-selected stock
- **Report column**: Button opens modal with full analysis (markdown rendered)
- **Responsive badges**: Color-coded recommendation badges
- **Loading state**: Shows TableSkeleton component

#### TableSkeleton
- **Exact structure match**: Same column layout as real table
- **Dark theme**: `bg-white/10` skeleton elements
- **Proper hover**: `hover:bg-white/5` matching real rows
- **Column-specific sizing**: Different skeleton sizes per column type

#### Pagination
- **Server-side**: Only loads requested page data
- **Responsive layouts**: Desktop (full) vs mobile (compact)
- **Smart page numbering**: Shows ellipsis for large page ranges
- **Rows per page**: 10, 20, 50, 100 options
- **URL integration**: Page and limit reflected in URL

### URL State Management

#### Supported Parameters
- `symbol` - Stock symbol filter
- `sector` - Sector selection
- `recommendation` - Recommendation filter
- `marketCapMin` - Minimum market cap (in millions)
- `marketCapMax` - Maximum market cap (in millions)
- `page` - Current page number
- `limit` - Items per page

#### URL Behavior
- **Clean URLs**: Default values (page=1, sector=all) are omitted
- **Shareable**: Complete filter state preserved in URL
- **Browser integration**: Back/forward buttons work correctly
- **Page refresh**: Filters persist after refresh
- **Deep linking**: Direct access to filtered results

### State Management Patterns

#### Filter State Flow
1. **URL → State**: `useSearchParams` initializes state from URL on mount
2. **User Input → State**: Form inputs update local state
3. **State → Debounced**: Text inputs debounced for API calls
4. **State → URL**: Filter changes update URL via `router.replace`
5. **Debounced → API**: API calls use debounced values

#### Navigation Integration
- **Home button**: Top-left navigation back to main dashboard
- **Stock selection**: Action buttons use `useSymbol` hook from Jotai
- **Symbol storage**: Persisted via `atomWithStorage` for cross-page state

### Performance Optimizations
- **Debouncing**: 500ms delay on text inputs prevents excessive API calls
- **Server pagination**: Only loads current page data
- **URL replace**: Uses `router.replace` with `scroll: false` to prevent jumping
- **Skeleton loading**: Immediate visual feedback during data fetches
- **Sticky headers**: Optimized scrolling experience

### Mobile Responsiveness
- **Collapsible filters**: Mobile filters hidden behind toggle button
- **Compact pagination**: Simplified mobile pagination layout
- **Responsive table**: Horizontal scroll for table on small screens
- **Touch-friendly**: Proper button sizes and spacing

### Common Issues & Solutions

#### Filter State Not Updating
- Check URL parameter names match exactly
- Ensure `useEffect` dependency array includes `searchParams`
- Verify `updateURL` function removes default values properly

#### Pagination Issues
- Always reset page to 1 when filters change
- Include page and limit in URL update calls
- Check server-side offset calculation: `(page - 1) * limit`

#### Debouncing Problems
- Use debounced values for API calls, raw values for UI
- Don't debounce dropdown selections (only text inputs)
- Ensure debounce delay matches UX expectations (500ms recommended)

#### Modal/Table Interaction
- Modal state is local to ScreenerTable component
- Response field can be null - handle gracefully
- Markdown rendering uses existing `MarkdownWithColor` component

## Testing & Quality

Always run both `pnpm lint` and `pnpm typecheck` before committing changes. The project uses strict TypeScript configuration and ESLint with Next.js rules.