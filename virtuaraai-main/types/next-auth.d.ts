import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    userId?: string;
    authError?: "RefreshAccessTokenError" | "BackendSessionUnavailable";
  }

  interface User {
    accessToken?: string;
    refreshToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    authError?: "RefreshAccessTokenError" | "BackendSessionUnavailable";
  }
}
