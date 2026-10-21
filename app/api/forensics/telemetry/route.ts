import { NextResponse } from "next/server";
import { getThreatTelemetryStats } from "@/lib/telemetry";

export async function GET() {
  const stats = getThreatTelemetryStats();
  return NextResponse.json(stats, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
