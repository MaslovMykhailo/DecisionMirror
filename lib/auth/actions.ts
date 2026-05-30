"use server";

import { signIn, signOut } from "@/auth";
import {
  googleSignInActionWithDeps,
  loginWithCredentialsActionWithDeps,
  logoutActionWithDeps,
  type AuthFormState,
} from "@/lib/auth/form-actions";

export async function loginWithCredentialsAction(
  prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  return loginWithCredentialsActionWithDeps(prevState, formData, { signIn });
}

export async function googleSignInAction(formData: FormData): Promise<void> {
  await googleSignInActionWithDeps(formData, { signIn });
}

export async function logoutAction(formData: FormData): Promise<void> {
  await logoutActionWithDeps(formData, { signOut });
}
