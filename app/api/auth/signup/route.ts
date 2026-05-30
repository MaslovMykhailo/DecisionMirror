import { authErrorCodes } from "@/lib/auth/validation";
import { signupWithCredentials } from "@/lib/auth/signup";

async function readJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    return Object.fromEntries(await request.formData());
  }

  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function POST(request: Request): Promise<Response> {
  const input = await readJson(request);
  const redirectTo =
    input &&
    typeof input === "object" &&
    "redirectTo" in input &&
    typeof input.redirectTo === "string"
      ? input.redirectTo
      : "/";
  const result = await signupWithCredentials(input, { redirectTo });

  if (result.status === "success") {
    return Response.json(result, { status: 201 });
  }

  if (result.status === "validation_error") {
    return Response.json(result, { status: 400 });
  }

  const status = result.error.code === authErrorCodes.duplicateEmail ? 409 : 500;
  return Response.json(result, { status });
}
