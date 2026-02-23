# Supabase → Convex Migration for thestockie

## Quick Start (3 steps)

### Step 1: Copy migration files to your project

```bash
# From your thestockie project root:
cp <downloaded>/convex/schema.ts    ./convex/schema.ts
cp <downloaded>/convex/migrate.ts   ./convex/migrate.ts
cp <downloaded>/scripts/migrate.ts  ./scripts/migrate.ts
```

### Step 2: Deploy schema + migration functions to Convex

```bash
npx convex dev
# Wait for "✓ Ready" — this deploys schema.ts and migrate.ts
# Keep this running in a separate terminal
```

### Step 3: Run the migration

```bash
# Install dependencies if needed
npm install pg dotenv

# Set your Supabase connection string (find in Supabase dashboard → Settings → Database)
export DATABASE_URL="postgresql://postgres.xxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
export CONVEX_URL="https://exciting-bee-603.convex.cloud"

# Run migration
npx tsx scripts/migrate.ts
```

Expected output:
```
🚀 Starting Supabase → Convex migration for thestockie
📦 Migrating users...       ✅ Inserted 15 users
📦 Migrating accounts...    ✅ Inserted 15 accounts
📦 Migrating sessions...    ✅ Inserted 23 sessions
📦 Migrating posts...       ✅ Inserted 446 posts
📦 Migrating verification tokens... ⏭️ No verification tokens
🎉 Migration complete!
```

### Step 4: Verify + Cleanup

1. Check data in Convex dashboard: https://dashboard.convex.dev
2. **Delete** `convex/migrate.ts` (temporary migration functions)
3. Redeploy: `npx convex dev`

## Data Mapping

| Supabase Table | Convex Table | Rows | Notes |
|---|---|---|---|
| thestockie_user | users | 15 | supabaseId preserves original UUID |
| thestockie_account | accounts | 15 | OAuth tokens (Google) |
| thestockie_session | sessions | 23 | Session tokens + expiry |
| thestockie_post | posts | 446 | Stock analyses with prompt/response |
| thestockie_verification_token | verificationTokens | 0 | Empty table |

## Important Notes

- **Supabase data is untouched** — this is a copy, not a move
- **Migration is idempotent** — running again will create duplicates, so only run once
- **ID mapping**: Original Supabase UUIDs stored as `supabaseId` fields; Convex generates its own `_id` 
- **Foreign keys**: Use `supabaseUserId` → `supabaseId` lookups via indexes
- **Timestamps**: Converted from ISO strings to milliseconds since epoch