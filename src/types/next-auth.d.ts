import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      role: string
      address: string
    } & DefaultSession["user"]
  }

  interface User {
    role?: string;
  }
}