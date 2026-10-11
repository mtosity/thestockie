import { v, type ObjectType, type PropertyValidators } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server";

/**
 * Functions that only the Next.js server may call.
 *
 * They stay public (the server reaches Convex over HTTP like any client), but every
 * call must carry `serverSecret`, which must equal the CONVEX_SERVER_SECRET env var
 * set on the deployment. The secret lives only in server-side env (never NEXT_PUBLIC_).
 */

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function assertServerSecret(secret: string): void {
  const expected = process.env.CONVEX_SERVER_SECRET;
  if (!expected || !safeEqual(secret, expected)) {
    throw new Error("Unauthorized");
  }
}

export function serverQuery<Args extends PropertyValidators, Output>(def: {
  args: Args;
  handler: (ctx: QueryCtx, args: ObjectType<Args>) => Promise<Output>;
}) {
  return query({
    args: { ...def.args, serverSecret: v.string() },
    handler: async (ctx, { serverSecret, ...args }: any): Promise<Output> => {
      assertServerSecret(serverSecret);
      return def.handler(ctx, args as ObjectType<Args>);
    },
  });
}

export function serverMutation<Args extends PropertyValidators, Output>(def: {
  args: Args;
  handler: (ctx: MutationCtx, args: ObjectType<Args>) => Promise<Output>;
}) {
  return mutation({
    args: { ...def.args, serverSecret: v.string() },
    handler: async (ctx, { serverSecret, ...args }: any): Promise<Output> => {
      assertServerSecret(serverSecret);
      return def.handler(ctx, args as ObjectType<Args>);
    },
  });
}
