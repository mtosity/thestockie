import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * HTTP endpoints for the external `thestockie-influencer` Go job.
 *
 * All routes require `Authorization: Bearer <INGEST_SECRET>`, where
 * INGEST_SECRET is a Convex environment variable:
 *
 *   npx convex env set INGEST_SECRET "<a-long-random-string>"
 *
 * Base URL is the deployment's `.convex.site` origin, e.g.
 *   https://exciting-bee-603.convex.site/influencer/active
 */

const http = httpRouter();

function authorized(request: Request): boolean {
  const secret = process.env.INGEST_SECRET;
  if (!secret) return false; // fail closed if unset
  const header = request.headers.get("Authorization") ?? "";
  return header === `Bearer ${secret}`;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Wrap a handler with auth + JSON-body parsing + uniform error handling.
function endpoint(
  fn: (ctx: any, body: any) => Promise<unknown>,
  { parseBody = true }: { parseBody?: boolean } = {}
) {
  return httpAction(async (ctx, request) => {
    if (!authorized(request)) return json({ error: "unauthorized" }, 401);
    let body: any = undefined;
    if (parseBody) {
      try {
        body = await request.json();
      } catch {
        return json({ error: "invalid JSON body" }, 400);
      }
    }
    try {
      const result = await fn(ctx, body);
      return json({ ok: true, result });
    } catch (err: any) {
      return json({ ok: false, error: String(err?.message ?? err) }, 500);
    }
  });
}

// GET active influencers (the job's scan list).
http.route({
  path: "/influencer/active",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!authorized(request)) return json({ error: "unauthorized" }, 401);
    const result = await ctx.runQuery(internal.influencer.listActive, {});
    return json({ ok: true, result });
  }),
});

// Upsert an influencer (sync the job's config list into Convex).
http.route({
  path: "/influencer/seed",
  method: "POST",
  handler: endpoint((ctx, b) =>
    ctx.runMutation(internal.influencer.upsertInfluencer, {
      name: b.name,
      channelId: b.channelId,
      handle: b.handle,
      youtubeUrl: b.youtubeUrl,
      avatar: b.avatar,
      description: b.description,
      active: b.active,
    })
  ),
});

// Register a discovered video; returns whether it's new (idempotent on videoId).
http.route({
  path: "/influencer/video/discover",
  method: "POST",
  handler: endpoint((ctx, b) =>
    ctx.runMutation(internal.influencer.discoverVideo, {
      channelId: b.channelId,
      videoId: b.videoId,
      title: b.title,
      url: b.url,
      publishedAt: b.publishedAt,
      durationSec: b.durationSec,
    })
  ),
});

// Update a video's processing status.
http.route({
  path: "/influencer/video/status",
  method: "POST",
  handler: endpoint((ctx, b) =>
    ctx.runMutation(internal.influencer.setVideoStatus, {
      videoId: b.videoId,
      status: b.status,
    })
  ),
});

// Store the full per-video analysis and mark it done.
http.route({
  path: "/influencer/video/result",
  method: "POST",
  handler: endpoint((ctx, b) =>
    ctx.runMutation(internal.influencer.saveVideoResult, {
      videoId: b.videoId,
      transcript: b.transcript,
      summary: b.summary,
      mentions: b.mentions ?? [],
      macro: b.macro,
    })
  ),
});

// Record a per-video failure.
http.route({
  path: "/influencer/video/error",
  method: "POST",
  handler: endpoint((ctx, b) =>
    ctx.runMutation(internal.influencer.markVideoError, {
      videoId: b.videoId,
      error: b.error,
    })
  ),
});

// Recompute per-symbol sentiment for a date; returns ranking + macro notes.
http.route({
  path: "/influencer/aggregate",
  method: "POST",
  handler: endpoint((ctx, b) =>
    ctx.runMutation(internal.influencer.aggregate, {
      date: b.date,
      windowDays: b.windowDays,
    })
  ),
});

// Store the LLM-written daily macro digest.
http.route({
  path: "/influencer/digest",
  method: "POST",
  handler: endpoint((ctx, b) =>
    ctx.runMutation(internal.influencer.saveDigest, b)
  ),
});

// Job-run bookkeeping.
http.route({
  path: "/influencer/run/start",
  method: "POST",
  handler: endpoint((ctx, b) =>
    ctx.runMutation(internal.influencer.startRun, { mode: b.mode })
  ),
});

http.route({
  path: "/influencer/run/finish",
  method: "POST",
  handler: endpoint((ctx, b) =>
    ctx.runMutation(internal.influencer.finishRun, {
      runId: b.runId,
      status: b.status,
      videosDiscovered: b.videosDiscovered,
      videosProcessed: b.videosProcessed,
      videosErrored: b.videosErrored,
      error: b.error,
    })
  ),
});

// Delete data older than the retention window.
http.route({
  path: "/influencer/purge",
  method: "POST",
  handler: endpoint((ctx, b) =>
    ctx.runMutation(internal.influencer.purgeOld, {
      olderThanDays: b.olderThanDays,
    })
  ),
});

export default http;
