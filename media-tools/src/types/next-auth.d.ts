import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "FREE" | "PRO" | "ADMIN";
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: "FREE" | "PRO" | "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: "FREE" | "PRO" | "ADMIN";
  }
}
