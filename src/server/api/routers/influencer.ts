import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { api } from "../../../../convex/_generated/api";

/**
 * Read-only API for the influencer feature. Data is produced by the external
 * `thestockie-influencer` Go job and stored in Convex.
 */
export const influencerRouter = createTRPCRouter({
  latestDigest: publicProcedure.query(async ({ ctx }) => {
    return (await ctx.convex.query(api.influencerReads.latestDigest, {})) ?? null;
  }),

  sentiment: publicProcedure
    .input(
      z
        .object({
          date: z.string().optional(),
          limit: z.number().min(1).max(50).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return await ctx.convex.query(api.influencerReads.sentimentRanking, {
        date: input?.date,
        limit: input?.limit,
      });
    }),

  influencers: publicProcedure.query(async ({ ctx }) => {
    return await ctx.convex.query(api.influencerReads.influencers, {});
  }),

  recentVideos: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(50).optional() }).optional())
    .query(async ({ ctx, input }) => {
      return await ctx.convex.query(api.influencerReads.recentVideos, {
        limit: input?.limit,
      });
    }),

  latestRun: publicProcedure.query(async ({ ctx }) => {
    return (await ctx.convex.query(api.influencerReads.latestRun, {})) ?? null;
  }),
});
