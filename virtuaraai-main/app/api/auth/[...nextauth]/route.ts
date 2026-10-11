import NextAuth, { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function jwtExpiry(token?: string) {
  if (!token) return 0;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return Number(payload.exp ?? 0) * 1000;
  } catch {
    return 0;
  }
}

async function refreshBackendToken(token: JWT): Promise<JWT> {
  if (!token.refreshToken) {
    return { ...token, accessToken: undefined, authError: "BackendSessionUnavailable" };
  }
  try {
    const response = await fetch(`${API_URL}/api/v1/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: token.refreshToken }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("refresh_failed");
    const data = await response.json();
    return {
      ...token,
      accessToken: data.access,
      refreshToken: data.refresh ?? token.refreshToken,
      accessTokenExpires: jwtExpiry(data.access),
      authError: undefined,
    };
  } catch {
    return { ...token, accessToken: undefined, authError: "RefreshAccessTokenError" };
  }
}

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(`${API_URL}/api/v1/auth/login/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!res.ok) return null;

          const data = await res.json();
          const user = data.user;

          return {
            id: user.id,
            name: user.full_name,
            email: user.email,
            image: user.profile_picture ?? null,
            accessToken: data.access,
            refreshToken: data.refresh,
          };
        } catch {
          return null;
        }
      },
    }),
  ],

  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return `${baseUrl}/onboarding`;
    },

    async jwt({ token, user, account, profile }) {
      // First sign-in: persist Django tokens
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image ?? token.picture;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpires = jwtExpiry(user.accessToken);
        token.authError = undefined;
      }
      // Google OAuth: no Django tokens on first sign-in (handle separately if needed)
      if (account?.provider === "google" && profile) {
        const p = profile as Record<string, unknown>;
        token.name = (p.name ?? p.given_name ?? token.name) as string;
        token.picture = (p.picture ?? token.picture) as string | undefined;
      }
      if (!token.accessToken) return token;
      const expires = token.accessTokenExpires || jwtExpiry(token.accessToken);
      if (expires > Date.now() + 30_000) return token;
      return refreshBackendToken(token);
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.name = (token.name as string) ?? session.user.name;
        session.user.email = (token.email as string) ?? session.user.email;
        session.user.image = (token.picture as string) ?? session.user.image;
      }
      // Expose Django JWT to client
      session.accessToken = token.accessToken;
      session.userId = token.id;
      session.authError = token.authError;
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
