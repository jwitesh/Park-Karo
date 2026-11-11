import type { DefaultSession } from "next-auth";

type AppRole = "RIDER" | "ATTENDANT" | "ADMIN";

declare module "next-auth" {
  interface User {
    role?: AppRole;
  }
  interface Session {
    user: { id: string; role: AppRole } & DefaultSession["user"];
  }
}
