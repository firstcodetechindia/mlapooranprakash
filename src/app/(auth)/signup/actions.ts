"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";
import {
  createOrganizationWithOwner,
  EmailAlreadyRegisteredError,
  signupSchema,
} from "@/lib/auth/signup";
import { enforceRateLimit, RateLimitError } from "@/lib/security/rate-limit";

export interface SignupFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function signupAction(
  _prevState: SignupFormState,
  formData: FormData,
): Promise<SignupFormState> {
  const parsed = signupSchema.safeParse({
    organizationName: formData.get("organizationName"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  try {
    await enforceRateLimit(`signup:${ip}`, 5, 3600);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { error: "Too many signup attempts from this network. Please try again later." };
    }
    throw error;
  }

  try {
    await createOrganizationWithOwner(parsed.data);
  } catch (error) {
    if (error instanceof EmailAlreadyRegisteredError) {
      return {
        error: error.message,
        fieldErrors: { email: error.message },
      };
    }
    throw error;
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // The account was created successfully even if this sign-in attempt
      // failed for some reason — send the user to log in manually rather
      // than losing the fact that signup already succeeded.
      return { error: "Account created. Please sign in." };
    }
    throw error;
  }

  return {};
}
