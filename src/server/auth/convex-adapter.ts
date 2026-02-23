import type { Adapter, AdapterUser, VerificationToken } from "next-auth/adapters";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { type Id } from "../../../convex/_generated/dataModel";

/**
 * Custom NextAuth v5 Adapter backed by Convex DB.
 *
 * Maps NextAuth adapter interface to Convex mutations/queries.
 * Designed to work with the schema in convex/schema.ts.
 */

function createConvexAdapter(client: ConvexHttpClient): Adapter {
  return {
    // ── User ──────────────────────────────────────────────────────────
    async createUser(user) {
      const id = await client.mutation(api.auth.createUser, {
        email: user.email,
        name: user.name ?? undefined,
        image: user.image ?? undefined,
        emailVerified: user.emailVerified
          ? user.emailVerified.getTime()
          : undefined,
      });
      return { ...user, id };
    },

    async getUser(id) {
      const user = await client.query(api.auth.getUser, {
        id: id as Id<"users">,
      });
      if (!user) return null;
      return {
        id: user._id,
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
        emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
      } satisfies AdapterUser;
    },

    async getUserByEmail(email) {
      const user = await client.query(api.auth.getUserByEmail, { email });
      if (!user) return null;
      return {
        id: user._id,
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
        emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
      } satisfies AdapterUser;
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const user = await client.query(api.auth.getUserByAccount, {
        provider,
        providerAccountId,
      });
      if (!user) return null;
      return {
        id: user._id,
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
        emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
      } satisfies AdapterUser;
    },

    async updateUser(user) {
      await client.mutation(api.auth.updateUser, {
        id: user.id as Id<"users">,
        name: user.name ?? undefined,
        image: user.image ?? undefined,
        emailVerified: user.emailVerified
          ? user.emailVerified.getTime()
          : undefined,
        email: user.email,
      });
      return user as AdapterUser;
    },

    async deleteUser(userId) {
      await client.mutation(api.auth.deleteUser, {
        id: userId as Id<"users">,
      });
    },

    // ── Account ──────────────────────────────────────────────────────
    async linkAccount(account) {
      await client.mutation(api.auth.linkAccount, {
        userId: account.userId as Id<"users">,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refreshToken: account.refresh_token ?? undefined,
        accessToken: account.access_token ?? undefined,
        expiresAt: account.expires_at ?? undefined,
        tokenType: account.token_type ?? undefined,
        scope: account.scope ?? undefined,
        idToken: account.id_token ?? undefined,
        sessionState:
          typeof account.session_state === "string"
            ? account.session_state
            : undefined,
      });
      return account;
    },

    async unlinkAccount({ provider, providerAccountId }) {
      await client.mutation(api.auth.unlinkAccount, {
        provider,
        providerAccountId,
      });
    },

    // ── Session ──────────────────────────────────────────────────────
    async createSession({ sessionToken, userId, expires }) {
      await client.mutation(api.auth.createSession, {
        sessionToken,
        userId: userId as Id<"users">,
        expires: expires.getTime(),
      });
      return { sessionToken, userId, expires };
    },

    async getSessionAndUser(sessionToken) {
      const result = await client.query(api.auth.getSessionAndUser, {
        sessionToken,
      });
      if (!result) return null;
      return {
        session: {
          sessionToken: result.session.sessionToken,
          userId: result.session.userId,
          expires: new Date(result.session.expires),
        },
        user: {
          id: result.user._id,
          email: result.user.email,
          name: result.user.name ?? null,
          image: result.user.image ?? null,
          emailVerified: result.user.emailVerified
            ? new Date(result.user.emailVerified)
            : null,
        } satisfies AdapterUser,
      };
    },

    async updateSession({ sessionToken, expires, userId }) {
      await client.mutation(api.auth.updateSession, {
        sessionToken,
        expires: expires ? expires.getTime() : undefined,
        userId: userId ? (userId as Id<"users">) : undefined,
      });
      if (!userId) return null;
      return { sessionToken, userId, expires: expires ?? new Date() };
    },

    async deleteSession(sessionToken) {
      await client.mutation(api.auth.deleteSession, { sessionToken });
    },

    // ── Verification Token ───────────────────────────────────────────
    async createVerificationToken({ identifier, token, expires }) {
      await client.mutation(api.auth.createVerificationToken, {
        identifier,
        token,
        expires: expires.getTime(),
      });
      return { identifier, token, expires };
    },

    async useVerificationToken({ identifier, token }) {
      const vt = await client.mutation(api.auth.useVerificationToken, {
        identifier,
        token,
      });
      if (!vt) return null;
      return {
        identifier: vt.identifier,
        token: vt.token,
        expires: new Date(vt.expires),
      } satisfies VerificationToken;
    },
  };
}

export { createConvexAdapter };
