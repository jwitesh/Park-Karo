"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function login(_prev: string | null, formData: FormData): Promise<string | null> {
  try {
    await signIn("credentials", {
      identifier: formData.get("identifier"),
      password: formData.get("password"),
      redirectTo: "/discover",
    });
    return null;
  } catch (e) {
    if (e instanceof AuthError) return "Invalid registration number / email or password.";
    throw e; // lets the redirect through
  }
}
