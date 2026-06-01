import { internalMutation } from "./_generated/server";

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
