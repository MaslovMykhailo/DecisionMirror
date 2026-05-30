import { signIn } from "@/auth";
import { authorizeCredentials } from "@/lib/auth/credentials";
import { invalidCredentialsError, loginSchema } from "@/lib/auth/validation";

async function readInput(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    return Object.fromEntries(await request.formData());
  }

  try {
    const parsed = await request.json();
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function redirectTo(request: Request, path: string): Response {
  return Response.redirect(new URL(path, request.url), 303);
}

export async function POST(request: Request): Promise<Response> {
  const input = await readInput(request);
  const parsed = loginSchema.safeParse(input);
  const redirectTarget = typeof input.redirectTo === "string" ? input.redirectTo : "/";
  const errorRedirectTo =
    typeof input.errorRedirectTo === "string" ? input.errorRedirectTo : "/login";

  if (!parsed.success) {
    return Response.json(
      { status: "validation_error", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const user = await authorizeCredentials(parsed.data);
  if (!user) {
    const error = invalidCredentialsError().formErrors?.[0] ?? "invalid_email_or_password";
    return redirectTo(request, `${errorRedirectTo}?error=${error}`);
  }

  await signIn("credentials", {
    ...parsed.data,
    redirectTo: redirectTarget,
  });

  return redirectTo(request, redirectTarget);
}
