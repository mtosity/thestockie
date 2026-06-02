import { internalMutation, query } from "./_generated/server";

/**
 * One-off cleanup of test/junk seed records (ciks like 999/1234/5678 created
 * while wiring up the HTTP ingest endpoints). Real SEC CIKs are >= 5 digits;
 * anything shorter is test data. Run with:
 *   npx convex run maintenance:purgeTestInvestors
 */
export const purgeTestInvestors = internalMutation({
  args: {},
  handler: async (ctx) => {
    const isJunk = (cik?: string) => !cik || !/^\d{5,}$/.test(cik);
    const removed = { investors: 0, filings: 0, positions: 0, consensus: 0 };

    for (const inv of await ctx.db.query("superInvestors").collect()) {
      if (isJunk(inv.cik)) {
        await ctx.db.delete(inv._id);
        removed.investors++;
      }
    }
    for (const f of await ctx.db.query("secFilings").collect()) {
      if (isJunk(f.cik)) {
        await ctx.db.delete(f._id);
        removed.filings++;
      }
    }
    for (const p of await ctx.db.query("investorPositions").collect()) {
      if (isJunk(p.cik)) {
        await ctx.db.delete(p._id);
        removed.positions++;
      }
    }
    return removed;
  },
});

/**
 * Drop test influencer seeds (e.g. "Test" / channelId "test123"). Real YouTube
 * channel ids start with "UC"; anything else is test data. Removes the creator
 * and any of its videos. Run with:
 *   npx convex run maintenance:purgeTestInfluencers
 */
export const purgeTestInfluencers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const removed = { influencers: 0, videos: 0 };
    for (const inf of await ctx.db.query("influencers").collect()) {
      if (inf.channelId.startsWith("UC")) continue;
      const videos = await ctx.db
        .query("influencerVideos")
        .withIndex("by_channelId", (q) => q.eq("channelId", inf.channelId))
        .collect();
      for (const v of videos) {
        await ctx.db.delete(v._id);
        removed.videos++;
      }
      await ctx.db.delete(inf._id);
      removed.influencers++;
    }
    return removed;
  },
});

// ── Schema-tightening migrations ──────────────────────────────────────────────
//
// These backfill legacy rows into the strict shapes the schema now enforces, so
// the tightened validators don't reject existing data on push. Run BOTH before
// pushing the tightened schema:
//   npx convex run maintenance:backfillMentionChannelIds
//   npx convex run maintenance:migrateDigestShapes

/**
 * Every videoStockMentions row must carry channelId (the canonical creator key).
 * Older rows stored the creator only as influencerId (an influencers _id) or
 * left it on the parent video. Resolve and backfill so channelId is always set.
 */
export const backfillMentionChannelIds = internalMutation({
  args: {},
  handler: async (ctx) => {
    const influencers = await ctx.db.query("influencers").collect();
    const channelById = new Map(influencers.map((i) => [i._id as string, i.channelId]));
    const videos = await ctx.db.query("influencerVideos").collect();
    const channelByVideo = new Map(videos.map((v) => [v.videoId, v.channelId]));

    let patched = 0;
    let unresolved = 0;
    for (const m of await ctx.db.query("videoStockMentions").collect()) {
      if (m.channelId) continue;
      const resolved =
        (m.influencerId && channelById.get(m.influencerId)) ||
        channelByVideo.get(m.videoId) ||
        "";
      if (!resolved) unresolved++;
      await ctx.db.patch(m._id, { channelId: resolved });
      patched++;
    }
    return { patched, unresolved };
  },
});

/** Parse a flattened action string ("Accumulate — rationale") into its parts. */
function splitAction(s: string): { action?: string; rationale: string } {
  const i = s.indexOf(" — ");
  return i > -1 ? { action: s.slice(0, i), rationale: s.slice(i + 3) } : { rationale: s };
}

/** Parse a flattened rotation string ("X → Y: rationale") into its parts. */
function splitRotation(s: string): { from?: string; to?: string; rationale: string } {
  const colon = s.indexOf(": ");
  const head = colon > -1 ? s.slice(0, colon) : "";
  const rationale = colon > -1 ? s.slice(colon + 2) : s;
  const [from, to] = head.split(" → ").map((x) => x.trim());
  return { from: from || undefined, to: to || undefined, rationale };
}

/**
 * Convert legacy macroDigest rows where recommendedActions / sector rotations
 * were stored as flattened strings (or under the plural `sectorRotations` key)
 * into the structured object arrays the schema + UI now expect.
 */
export const migrateDigestShapes = internalMutation({
  args: {},
  handler: async (ctx) => {
    let migrated = 0;
    for (const d of await ctx.db.query("macroDigest").collect()) {
      const patch: Record<string, unknown> = {};

      const actions = (d.recommendedActions ?? []) as unknown[];
      if (actions.some((a) => typeof a === "string")) {
        patch.recommendedActions = actions.map((a) =>
          typeof a === "string" ? splitAction(a) : a,
        );
      }

      const rotObjs = (d.sectorRotation ?? []) as unknown[];
      const rotStrs = ((d as { sectorRotations?: unknown[] }).sectorRotations ??
        []) as unknown[];
      if (rotObjs.length === 0 && rotStrs.length > 0) {
        patch.sectorRotation = rotStrs.map((r) =>
          typeof r === "string" ? splitRotation(r) : r,
        );
        patch.sectorRotations = [];
      } else if (rotObjs.some((r) => typeof r === "string")) {
        patch.sectorRotation = rotObjs.map((r) =>
          typeof r === "string" ? splitRotation(r) : r,
        );
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(d._id, patch);
        migrated++;
      }
    }
    return { migrated };
  },
});

// ── Post-run health check ─────────────────────────────────────────────────────
//
// Cheap assertions the deployment agent can call after each job run /
// aggregation to catch contract drift (the class of bug that silently produced
// "unknown" creators and blank digest actions). Returns { ok, problems }.
//   npx convex run maintenance:verifyHealth
export const verifyHealth = query({
  args: {},
  handler: async (ctx) => {
    const problems: string[] = [];

    const sentiment = await ctx.db.query("dailySentiment").collect();
    if (sentiment.length === 0) {
      problems.push("dailySentiment is empty — aggregateSentiment may not have run");
    } else {
      const named = (xs?: string[]) => (xs ?? []).every((n) => n && n !== "unknown" && n !== "Unknown creator");
      const badNames = sentiment.filter(
        (s) => !named(s.bullishCreators) || !named(s.bearishCreators) || !named(s.neutralCreators),
      );
      if (badNames.length > 0) {
        problems.push(`${badNames.length} sentiment rows have unresolved ("unknown") creator names`);
      }
      const maxDistinct = Math.max(
        ...sentiment.map((s) => (s.bullishCreators?.length ?? 0) + (s.bearishCreators?.length ?? 0)),
      );
      if (maxDistinct < 2) {
        problems.push("no stock has >=2 distinct creators — creator dedup may be collapsing everyone into one bucket");
      }
      const noCompany = sentiment.filter((s) => !s.companyName).length;
      if (noCompany === sentiment.length) {
        problems.push("no sentiment row has a companyName — companyName is not being stored");
      }
    }

    const mentions = await ctx.db.query("videoStockMentions").collect();
    const missingChannel = mentions.filter((m) => !m.channelId).length;
    if (missingChannel > 0) {
      problems.push(`${missingChannel} mentions are missing channelId (the canonical creator key)`);
    }

    const digests = await ctx.db.query("macroDigest").collect();
    const latest = digests.sort((a, b) => b.createdAt - a.createdAt)[0];
    if (!latest) {
      problems.push("no macroDigest rows");
    } else {
      const actions = (latest.recommendedActions ?? []) as Array<{ action?: string; rationale?: string } | string>;
      const blank = actions.filter(
        (a) => typeof a === "string" || !a.action || !a.rationale,
      ).length;
      if (actions.length > 0 && blank > 0) {
        problems.push(`latest digest has ${blank}/${actions.length} recommendedActions with empty action/rationale`);
      }
    }

    return { ok: problems.length === 0, problems, checkedAt: Date.now() };
  },
});
