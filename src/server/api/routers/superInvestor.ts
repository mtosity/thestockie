import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { api } from "../../../../convex/_generated/api";

/**
 * Read-only API for the super-investor (13F) feature. Data is produced by the
 * external `superinvestor-job` and stored in Convex.
 */
export const superInvestorRouter = createTRPCRouter({
  investors: publicProcedure.query(async ({ ctx }) => {
    return await ctx.convex.query(api.superInvestorReads.investors, {});
  }),

  consensus: publicProcedure
    .input(
      z
        .object({
          period: z.string().optional(),
          limit: z.number().min(1).max(50).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return await ctx.convex.query(api.superInvestorReads.consensus, {
        period: input?.period,
        limit: input?.limit,
      });
    }),

  notableMoves: publicProcedure
    .input(
      z
        .object({
          period: z.string().optional(),
          limit: z.number().min(1).max(20).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return await ctx.convex.query(api.superInvestorReads.notableMoves, {
        period: input?.period,
        limit: input?.limit,
      });
    }),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string(), period: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return (
        (await ctx.convex.query(api.superInvestorReads.investorBySlug, {
          slug: input.slug,
          period: input.period,
        })) ?? null
      );
    }),
});
