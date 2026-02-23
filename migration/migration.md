# Supabase → Convex Migration History

This folder documents the one-time migration of thestockie from Supabase/PostgreSQL to Convex DB.
The migration is **complete** — these files are preserved for historical reference only.

## Files

| File | Purpose |
|------|---------|
| `convex-schema-as-migrated.ts` | The initial Convex schema used during migration. Uses `supabaseUserId` string FKs. Differs from the current `convex/schema.ts` which uses proper `v.id("users")` typed references post-cleanup. |
| `convex-mutation-functions.ts` | Temporary Convex mutations (`insertUsers`, `insertAccounts`, `insertPosts`, etc.) that were deployed to `convex/` during the migration run to accept bulk data inserts. Deleted from `convex/` after migration. |
| `supabase-to-convex-runner.ts` | Node.js script that connected to Supabase Postgres via `pg`, read all rows, and called the mutations above via `ConvexHttpClient`. Run once on ~Feb 23 2026. |

## What Was Migrated

| Supabase Table | Convex Table | Notes |
|---|---|---|
| `thestockie_user` | `users` | Original UUIDs preserved as `supabaseId` |
| `thestockie_account` | `accounts` | OAuth tokens (Google) |
| `thestockie_session` | `sessions` | Session tokens + expiry |
| `thestockie_post` | `posts` | Stock analyses with LLM prompt/response (~446 rows) |
| `thestockie_verification_token` | `verificationTokens` | Was empty |

## How It Worked (3 steps)

1. **Deploy migration functions** — `convex-mutation-functions.ts` was temporarily copied into `convex/migrate.ts` and deployed via `npx convex dev`. This gave the runner script public HTTP endpoints to call.

2. **Run the runner script** — `supabase-to-convex-runner.ts` was executed with `DATABASE_URL` (Supabase Postgres) and `CONVEX_URL` set. It read each table and called the Convex mutations in batches.

3. **Cleanup** — `convex/migrate.ts` was deleted and Convex was redeployed. `convex/schema.ts` was updated to use proper `v.id("users")` foreign keys instead of the migration-era `supabaseUserId` strings.

## Important Notes

- **Migration is NOT idempotent** — running again would create duplicate rows
- **Supabase data was not deleted** — this was a copy, not a move
- **ID mapping**: Original Supabase UUIDs are stored as `supabaseId` fields; Convex generates its own `_id`