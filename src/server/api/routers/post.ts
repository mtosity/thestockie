import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { posts } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({
  // baseURL: "https://api.deepseek.com",
  apiKey: process.env.AI_API_KEY,
});

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
      const existingPost = await ctx.db.query.posts.findFirst({
        where: eq(posts.id, input.symbol),
      });

      // check if created recently (within 1 week)
      if (
        existingPost &&
        new Date(existingPost.createdAt).getTime() >
          new Date().getTime() - 7 * 24 * 60 * 60 * 1000
      ) {
        return existingPost;
      }

      // call deekseek API
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are a professional investors working at highly known Hedge Funds,Venture Capital Firms, Private Equity Firms, your goal is to help the firm getting more returns on stock trades\n" +
              "Your job is looking at fundamentals, quantitative numbers for a giving and give me recommendation: Red / Green / Netural for important numbers. Then giving recommndation about the stock, check if the stock is a strong buy / short / neutral. Please bold the important numbers and recommendation.\n.",
          },
          {
            role: "user",
            content: input.prompt,
          },
        ],
        model: "gpt-4.5-preview",
        store: true,
      });
      const response = completion.choices[0]?.message.content;

      // update
      if (existingPost) {
        return await ctx.db
          .update(posts)
          .set({
            prompt: input.prompt,
            response,
            createdById: ctx.session.user.id,
          })
          .where(eq(posts.id, input.symbol))
          .returning()
          .then((rows) => rows[0]);
      } else {
        return await ctx.db
          .insert(posts)
          .values({
            id: input.symbol,
            prompt: input.prompt,
            response,
            createdById: ctx.session.user.id,
          })
          .returning()
          .then((rows) => rows[0]);
      }
    }),

  getLatest: protectedProcedure.input(String).query(async ({ ctx, input }) => {
    const post = await ctx.db.query.posts.findFirst({
      where: eq(posts.id, input),
    });

    return post ?? null;
  }),
});
