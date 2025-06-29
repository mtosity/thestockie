import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { posts } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const postRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        symbol: z.string().min(1),
        prompt: z.string().min(1),
        // response: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.query.posts.findFirst({
        where: eq(posts.id, input.symbol),
      });
    }),

  getLatest: protectedProcedure.input(String).query(async ({ ctx, input }) => {
    const post = await ctx.db.query.posts.findFirst({
      where: eq(posts.id, input),
    });

    return post ?? null;
  }),
});
