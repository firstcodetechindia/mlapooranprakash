"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";
import {
  createOrganizationWithOwner,
  EmailAlreadyRegisteredError,
  signupSchema,
} from "@/lib/auth/signup";

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
