/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import NodeCache from "node-cache";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { type MiddlewareResult } from "@trpc/server/unstable-core-do-not-import";
import axios, { type AxiosError } from "axios";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();
  const origin = opts.headers.get("origin") ?? opts.headers.get("referer");
  const urls = [
    "http://localhost:3000/",
    "https://thestockie.vercel.app/",
    "https://www.thestockie.vercel.app/",
    "https://thestockie.com/",
    "https://www.thestockie.com/",
    "http://localhost:3000",
    "https://www.thestockie.com",
  ];
  if (!origin || !urls.find((url) => origin.startsWith(url))) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: `Invalid origin for ${origin}`,
    });
  }

  const ONE_MINUTE_IN_SECONDS = 60 * 5;
  opts.headers.set(
    "cache-control",
    `s-maxage=1, stale-while-revalidate=${ONE_MINUTE_IN_SECONDS}`,
  ); // 5 minutes cache

  return {
    db,
    session,
    ...opts,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    console.log(error.cause);
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
        responseError: (error.cause as AxiosError)?.response?.data,
      },
    };
  },
});

// Initialize cache with 10 minute TTL
const cache = new NodeCache({ stdTTL: 10 * 60 });

// Cache middleware
const cacheMiddleware = t.middleware(
  async ({ path, next, getRawInput, type }) => {
    const rawInput = await getRawInput();
    // Skip caching for mutations
    if (type === "mutation") return next();

    // Create unique cache key from path and input
    const cacheKey = `${path}-${JSON.stringify(rawInput)}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached as MiddlewareResult<object>;
    }

    // Get fresh data
    const result = await next();

    if (result.ok) {
      // Store in cache
      cache.set(cacheKey, result);
    }

    return result;
  },
);

// // Custom cache key generator
// const generateCacheKey = (data: unknown): string => {
//   const hash = createHash("sha256");
//   hash.update(JSON.stringify(data));
//   return hash.digest("hex").slice(0, 16);
// };

// const edgeCacheMiddleware = t.middleware(
//   async ({ path, type, next, getRawInput, ctx }) => {
//     const rawInput = getRawInput();
//     if (type === "mutation") return next();

//     const headers = new Headers(ctx.headers);

//     // Generate unique cache key
//     const cacheKey = generateCacheKey({ path, input: rawInput });
//     headers.set("x-cache-key", cacheKey);
//     headers.set(
//       "Cache-Control",
//       `public, s-maxage=${FIVE_MINUTES}, stale-while-revalidate=${ONE_MINUTE}`,
//     );
//     headers.set(
//       "CDN-Cache-Control",
//       `public, s-maxage=${FIVE_MINUTES}, stale-while-revalidate=${ONE_MINUTE}`,
//     );
//     headers.set(
//       "Vercel-CDN-Cache-Control",
//       `public, s-maxage=${FIVE_MINUTES}, stale-while-revalidate=${ONE_MINUTE}`,
//     );

//     const result = await next();
//     return result;
//   },
// );

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure
  .use(timingMiddleware)
  // .use(edgeCacheMiddleware)
  .use(cacheMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session || !ctx.session.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });
