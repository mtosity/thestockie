import { z } from "zod";
import { and, eq, gte, lte, sql } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { posts } from "~/server/db/schema";

export const postRouter = createTRPCRouter({
  create: publicProcedure
    .input(
      z.object({
        symbol: z.string().min(1),
        prompt: z.string().min(1),
        // response: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.db.query.posts.findFirst({
        where: eq(posts.id, input.symbol),
      });
      return data ?? null;
    }),

  getLatest: publicProcedure.input(String).query(async ({ ctx, input }) => {
    const post = await ctx.db.query.posts.findFirst({
      where: eq(posts.id, input),
    });

    return post ?? null;
  }),

  getAll: publicProcedure
    .input(
      z
        .object({
          symbol: z.string().optional(),
          sector: z.string().optional(),
          recommendation: z
            .enum(["strong_buy", "buy", "hold", "sell"])
            .optional(),
          marketCapMin: z.number().optional(),
          marketCapMax: z.number().optional(),
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const filters = [];
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 20;
      const offset = (page - 1) * limit;

      if (input?.symbol) {
        filters.push(eq(posts.id, input.symbol.toUpperCase()));
      }

      if (input?.sector) {
        filters.push(eq(posts.sector, input.sector));
      }

      if (input?.recommendation) {
        filters.push(eq(posts.recommendation, input.recommendation));
      }

      if (input?.marketCapMin) {
        filters.push(gte(posts.market_cap, input.marketCapMin));
      }

      if (input?.marketCapMax) {
        filters.push(lte(posts.market_cap, input.marketCapMax));
      }

      const whereClause = filters.length > 0 ? and(...filters) : undefined;

      // Get total count for pagination
      const totalCount = await ctx.db
        .select({ count: sql`count(*)` })
        .from(posts)
        .where(whereClause)
        .then((result) => Number(result[0]?.count ?? 0));

      // Get paginated results
      const data = await ctx.db.query.posts.findMany({
        orderBy: (posts, { desc }) => [desc(posts.createdAt)],
        where: whereClause,
        limit,
        offset,
      });

      return {
        data,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1,
        },
      };
    }),
});
