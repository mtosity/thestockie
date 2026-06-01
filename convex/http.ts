import { httpAction } from "./_generated/server";
import { httpRouter } from "convex/server";
import { api } from "./_generated/api";

/**
 * Public HTTP endpoints for the Go influencer job.
 * All routes are under /influencer/* and guarded by Authorization: Bearer ${INGEST_SECRET}
 * Returns {ok: true, result: T} envelope expected by the Go client.
 */

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

// ── Main handler (httpAction) ─────────────────────────────────────────────────

export const handleInfluencer = httpAction(async (ctx, req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  const authErr = checkAuth(req);
  if (authErr) return authErr;

  try {
    const route = path.replace(/^\/influencer/, "");

    switch (route) {
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
        return jsonResponse(404, { ok: false, error: `Unknown route: ${route} (full path: ${path})` });
    }
  } catch (e: any) {
    console.error("Ingest error:", e);
    return jsonResponse(500, { ok: false, error: e.message ?? "Internal error" });
  }
});

// ── Router definition ────────────────────────────────────────────────────────

const http = httpRouter();

// Mount everything under /influencer/* — both GET and POST
http.route({
  path: "/influencer/*",
  method: "POST",
  handler: handleInfluencer,
});

http.route({
  path: "/influencer/active",
  method: "GET",
  handler: handleInfluencer,
});

export default http;
