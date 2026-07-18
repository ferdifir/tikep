import { NextResponse } from "next/server";
import { appVersion } from "@/lib/app-version";

export function GET() {
  return NextResponse.json({
    ok: true,
    name: "tikep",
    version: appVersion,
    timestamp: new Date().toISOString(),
  });
}
