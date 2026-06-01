import { httpAction } from "./_generated/server";
import { httpRouter } from "convex/server";
import { api } from "./_generated/api";

function checkAuth(req: Request): Response | null {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.INGEST_SECRET}`;
  if (auth !== expected) {
    return jsonResponse(401, { ok: false, error: "Unauthorized" });
  }
  return null;
}

function jsonResponse(status: number, body: any): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function parseBody(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

// ── Investor handler ─────────────────────────────────────────────────────────

export const handleInvestor = httpAction(async (ctx, req) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/investor/, "");

  const authErr = checkAuth(req);
  if (authErr) return authErr;

  try {
    switch (path) {
      case "/active": {
        const investors = await ctx.runQuery(api.investors.getActiveInvestors, {});
        return jsonResponse(200, { ok: true, result: investors });
      }

      case "/seed": {
        const body = await parseBody(req);
        await ctx.runMutation(api.investors.seedInvestor, body);
        return jsonResponse(200, { ok: true, result: null });
      }

      case "/cusip/lookup": {
        const body = await parseBody(req);
        const result = await ctx.runQuery(api.investors.cusipLookup, body);
        return jsonResponse(200, { ok: true, result });
      }

      case "/cusip/save": {
        const body = await parseBody(req);
        await ctx.runMutation(api.investors.cusipSave, body);
        return jsonResponse(200, { ok: true, result: null });
      }

      case "/filing": {
        const body = await parseBody(req);
        await ctx.runMutation(api.investors.saveFiling, body);
        return jsonResponse(200, { ok: true, result: null });
      }

      case "/aggregate": {
        const body = await parseBody(req);
        const result = await ctx.runMutation(api.investors.aggregateConsensus, body);
        return jsonResponse(200, { ok: true, result });
      }

      default:
        return jsonResponse(404, { ok: false, error: `Unknown investor route: ${path}` });
    }
  } catch (e: any) {
    console.error("Investor error:", e);
    return jsonResponse(500, { ok: false, error: e.message ?? "Internal error" });
  }
});

// ── Influencer handler ───────────────────────────────────────────────────────

export const handleInfluencer = httpAction(async (ctx, req) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/influencer/, "");

  const authErr = checkAuth(req);
  if (authErr) return authErr;

  try {
    switch (path) {
      case "/active": {
        const influencers = await ctx.runQuery(api.influencer.getActiveInfluencers, {});
        return jsonResponse(200, { ok: true, result: influencers });
      }

      case "/seed": {
        const body = await parseBody(req);
        const influencers = body.influencers ?? [body];
        await ctx.runMutation(api.influencer.seedInfluencers, { influencers });
        return jsonResponse(200, { ok: true, result: null });
      }

      case "/video/discover": {
        const body = await parseBody(req);
        const result = await ctx.runMutation(api.influencer.discoverVideo, body);
        return jsonResponse(200, { ok: true, result });
      }

      case "/video/status": {
        const body = await parseBody(req);
        await ctx.runMutation(api.influencer.setVideoStatus, body);
        return jsonResponse(200, { ok: true, result: null });
      }

      case "/video/error": {
        const body = await parseBody(req);
        await ctx.runMutation(api.influencer.setVideoError, body);
        return jsonResponse(200, { ok: true, result: null });
      }

      case "/video/result": {
        const body = await parseBody(req);
        await ctx.runMutation(api.influencer.saveVideoResult, body);
        return jsonResponse(200, { ok: true, result: null });
      }

      case "/aggregate": {
        const body = await parseBody(req);
        const result = await ctx.runMutation(api.influencer.aggregateSentiment, body);
        return jsonResponse(200, { ok: true, result });
      }

      case "/digest": {
        const body = await parseBody(req);
        await ctx.runMutation(api.influencer.saveDigest, body);
        return jsonResponse(200, { ok: true, result: null });
      }

      case "/purge": {
        const body = await parseBody(req);
        const result = await ctx.runMutation(api.influencer.purgeOld, body);
        return jsonResponse(200, { ok: true, result });
      }

      case "/run/start": {
        const body = await parseBody(req);
        const result = await ctx.runMutation(api.influencer.startJobRun, body);
        return jsonResponse(200, { ok: true, result: result.id });
      }

      case "/run/finish": {
        const body = await parseBody(req);
        await ctx.runMutation(api.influencer.endJobRun, body);
        return jsonResponse(200, { ok: true, result: null });
      }

      default:
        return jsonResponse(404, { ok: false, error: `Unknown influencer route: ${path}` });
    }
  } catch (e: any) {
    console.error("Ingest error:", e);
    return jsonResponse(500, { ok: false, error: e.message ?? "Internal error" });
  }
});

// ── Router with EXACT paths (not wildcards) ──────────────────────────────────

const http = httpRouter();

// Investor routes — EXACT paths
http.route({ path: "/investor/active", method: "GET", handler: handleInvestor });
http.route({ path: "/investor/seed", method: "POST", handler: handleInvestor });
http.route({ path: "/investor/cusip/lookup", method: "POST", handler: handleInvestor });
http.route({ path: "/investor/cusip/save", method: "POST", handler: handleInvestor });
http.route({ path: "/investor/filing", method: "POST", handler: handleInvestor });
http.route({ path: "/investor/aggregate", method: "POST", handler: handleInvestor });

// Influencer routes — EXACT paths
http.route({ path: "/influencer/active", method: "GET", handler: handleInfluencer });
http.route({ path: "/influencer/seed", method: "POST", handler: handleInfluencer });
http.route({ path: "/influencer/video/discover", method: "POST", handler: handleInfluencer });
http.route({ path: "/influencer/video/status", method: "POST", handler: handleInfluencer });
http.route({ path: "/influencer/video/error", method: "POST", handler: handleInfluencer });
http.route({ path: "/influencer/video/result", method: "POST", handler: handleInfluencer });
http.route({ path: "/influencer/aggregate", method: "POST", handler: handleInfluencer });
http.route({ path: "/influencer/digest", method: "POST", handler: handleInfluencer });
http.route({ path: "/influencer/purge", method: "POST", handler: handleInfluencer });
http.route({ path: "/influencer/run/start", method: "POST", handler: handleInfluencer });
http.route({ path: "/influencer/run/finish", method: "POST", handler: handleInfluencer });

export default http;
