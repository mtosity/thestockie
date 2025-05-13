import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { posts } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
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

      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "---Role--- You are a professional investors working at highly known Hedge Funds,Venture Capital Firms, Private Equity Firms, your goal is to help the firm getting more returns on stock trades\n" +
              "---Goal--- Your job is looking at fundamentals, quantitative numbers for a giving and give me recommendation: Red / Green / Netural for important numbers. Then giving recommndation about the stock, check if the stock is a strong buy / short / neutral. Please bold the important numbers and recommendation.\n." +
              "Analyze the company’s financial health: discuss profitability, liquidity, and solvency trends. Highlight any significant improvements or deteriorations in metrics and what they suggest about future performance \n" +
              "Interpret these ratios relative to the industry averages and explain whether the stock appears undervalued or overvalued" +
              "I’m interested in [Ticker]. Provide a brief outlook for this stock over the next 1-2 years and a recommendation whether to buy, hold, or sell. Consider the company’s fundamentals, any recent news, and overall market conditions in your analysis \n" +
              "Act as an experienced trader. Analyze the recent price and volume chart of Stock ABC. Identify any technical patterns or signals (trendlines, support/resistance levels, RSI, etc.) indicating a potential swing trade opportunity. Specify a possible entry price, target price, and stop-loss level, with reasoning for each based on the chart.\n" +
              "---Target response length and format--- Add sections and commentary to the response as appropriate for the length and format. Style the response in markdown format with appropriate end lines.",
          },
          {
            role: "user",
            content: input.prompt,
          },
        ],
        model: "deepseek-reasoner",
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
            createdAt: new Date(),
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
