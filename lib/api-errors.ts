import { NextResponse } from "next/server";
import { isAuthenticationError } from "@/lib/auth-errors";

export function authErrorResponse(error: unknown) {
  if (!isAuthenticationError(error)) {
    return null;
  }

  return NextResponse.json({ error: error.message }, { status: 401 });
}
