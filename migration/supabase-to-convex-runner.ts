#!/usr/bin/env npx tsx
/**
 * Migration script: Supabase → Convex for thestockie
 *
 * Prerequisites:
 *   1. Copy convex/schema.ts and migration/migrate1.ts into your project's convex/ folder
 *      (migrate1.ts defines the insertUsers/insertAccounts/etc. mutations used below)
 *      See: migration/migrate1.ts
 *   2. Run `npx convex dev` to deploy the schema + migration functions
 *      Keep this running in a separate terminal
 *   3. Set environment variables:
 *      - DATABASE_URL: Your Supabase connection string (Postgres)
 *      - CONVEX_URL: Your Convex deployment URL (from https://dashboard.convex.dev)
 *   4. Install deps: npm install pg dotenv
 *
 * Usage:
 *   npx tsx migration/migrate2.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import pg from "pg";

// ── Configuration ──────────────────────────────────────────────────────
const CONVEX_URL = process.env.CONVEX_URL;
const DATABASE_URL = process.env.DATABASE_URL;

if (!CONVEX_URL) {
  console.error("❌ Set CONVEX_URL to your Convex deployment URL (find it at https://dashboard.convex.dev)");
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error("❌ Set DATABASE_URL to your Supabase Postgres connection string");
  process.exit(1);
}

const convex = new ConvexHttpClient(CONVEX_URL!);
const pool = new pg.Pool({ connectionString: DATABASE_URL! });

// ── Helpers ────────────────────────────────────────────────────────────
function toMs(ts: string | null): number | undefined {
  if (!ts) return undefined;
  return new Date(ts).getTime();
}

function toMsRequired(ts: string): number {
  return new Date(ts).getTime();
}

// ── Step 1: Migrate Users ──────────────────────────────────────────────
async function migrateUsers() {
  console.log("\n📦 Migrating users...");
  const { rows } = await pool.query("SELECT * FROM thestockie_user");

  const users = rows.map((r: any) => ({
    supabaseId: r.id,
    name: r.name || undefined,
    email: r.email,
    image: r.image || undefined,
    emailVerified: toMs(r.email_verified),
  }));

  await convex.mutation(api.migrate.insertUsers, { users });
  console.log(`  ✅ Inserted ${users.length} users`);
}

// ── Step 2: Migrate Accounts ───────────────────────────────────────────
async function migrateAccounts() {
  console.log("\n📦 Migrating accounts...");
  const { rows } = await pool.query("SELECT * FROM thestockie_account");

  const accounts = rows.map((r: any) => ({
    supabaseUserId: r.user_id,
    type: r.type,
    provider: r.provider,
    providerAccountId: r.provider_account_id,
    refreshToken: r.refresh_token || undefined,
    accessToken: r.access_token || undefined,
    expiresAt: r.expires_at || undefined,
    tokenType: r.token_type || undefined,
    scope: r.scope || undefined,
    idToken: r.id_token || undefined,
    sessionState: r.session_state || undefined,
  }));

  await convex.mutation(api.migrate.insertAccounts, { accounts });
  console.log(`  ✅ Inserted ${accounts.length} accounts`);
}

// ── Step 3: Migrate Sessions ───────────────────────────────────────────
async function migrateSessions() {
  console.log("\n📦 Migrating sessions...");
  const { rows } = await pool.query("SELECT * FROM thestockie_session");

  const sessions = rows.map((r: any) => ({
    sessionToken: r.session_token,
    supabaseUserId: r.user_id,
    expires: toMsRequired(r.expires),
  }));

  await convex.mutation(api.migrate.insertSessions, { sessions });
  console.log(`  ✅ Inserted ${sessions.length} sessions`);
}

// ── Step 4: Migrate Posts (batched - large payloads) ───────────────────
async function migratePosts() {
  console.log("\n📦 Migrating posts...");
  const { rows } = await pool.query(
    "SELECT * FROM thestockie_post ORDER BY created_at"
  );

  let inserted = 0;
  const BATCH_SIZE = 10; // Small batches since posts have large text fields

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const posts = batch.map((r: any) => ({
      supabaseId: r.id,
      prompt: r.prompt || undefined,
      response: r.response || undefined,
      createdBy: r.created_by,
      recommendation: r.recommendation || undefined,
      marketCap: r.market_cap ? Number(r.market_cap) : undefined,
      sector: r.sector || undefined,
      createdAt: toMsRequired(r.created_at),
      updatedAt: toMs(r.updated_at),
    }));

    try {
      await convex.mutation(api.migrate.insertPosts, { posts });
      inserted += posts.length;
      process.stdout.write(
        `\r  📊 Progress: ${inserted}/${rows.length} posts`
      );
    } catch (e: any) {
      // If batch is too large, fall back to individual inserts
      console.warn(`\n  ⚠️  Batch failed, inserting individually...`);
      for (const post of posts) {
        try {
          await convex.mutation(api.migrate.insertPost, post);
          inserted++;
          process.stdout.write(
            `\r  📊 Progress: ${inserted}/${rows.length} posts`
          );
        } catch (e2: any) {
          console.error(`\n  ❌ Failed to insert post ${post.supabaseId}: ${e2.message}`);
        }
      }
    }
  }

  console.log(`\n  ✅ Inserted ${inserted} posts`);
}

// ── Step 5: Migrate Verification Tokens ────────────────────────────────
async function migrateVerificationTokens() {
  console.log("\n📦 Migrating verification tokens...");
  const { rows } = await pool.query("SELECT * FROM thestockie_verification_token");

  if (rows.length === 0) {
    console.log("  ⏭️  No verification tokens to migrate");
    return;
  }

  const tokens = rows.map((r: any) => ({
    identifier: r.identifier,
    token: r.token,
    expires: toMsRequired(r.expires),
  }));

  await convex.mutation(api.migrate.insertVerificationTokens, { tokens });
  console.log(`  ✅ Inserted ${tokens.length} tokens`);
}

// ── Run Migration ──────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Starting Supabase → Convex migration for thestockie");
  console.log(`   Convex: ${CONVEX_URL}`);
  console.log(`   Supabase: ${DATABASE_URL!.replace(/:[^:@]+@/, ":***@")}`);

  try {
    // Order matters: users first (referenced by other tables)
    await migrateUsers();
    await migrateAccounts();
    await migrateSessions();
    await migratePosts();
    await migrateVerificationTokens();

    console.log("\n🎉 Migration complete!");
  } catch (err) {
    console.error("\n❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();