import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { api } from "../../../../convex/_generated/api";

const recommendationEnum = z.enum(["strong_buy", "buy", "hold", "sell"]);

export const postRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        symbol: z.string().min(1),
        prompt: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.convex.query(api.posts.getBySymbol, {
        symbol: input.symbol.toUpperCase(),
      });
      return data ?? null;
    }),

  getLatest: publicProcedure.input(String).query(async ({ ctx, input }) => {
    const post = await ctx.convex.query(api.posts.getBySymbol, {
      symbol: input,
    });
    return post ?? null;
  }),

  getAll: publicProcedure
    .input(
      z
        .object({
          symbol: z.string().optional(),
          sector: z.string().optional(),
          recommendation: recommendationEnum.optional(),
          marketCapMin: z.number().optional(),
          marketCapMax: z.number().optional(),
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return await ctx.convex.query(api.posts.getAll, {
        symbol: input?.symbol,
        sector: input?.sector,
        recommendation: input?.recommendation,
        marketCapMin: input?.marketCapMin,
        marketCapMax: input?.marketCapMax,
        page: input?.page,
        limit: input?.limit,
      });
    }),
});
