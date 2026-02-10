// =============================================================================
// DAILY RESET CRON API
// Scheduled to run daily at 00:00 UTC.
// Resets daily nudge counts and performs other daily maintenance.
//
// This endpoint should be called by a cron service (e.g., Vercel Cron, GitHub Actions).
// It requires a CRON_SECRET environment variable for authentication.
// =============================================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// -----------------------------------------------------------------------------
// POST /api/cron/daily-reset
// -----------------------------------------------------------------------------

export async function POST(request: Request) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Create admin Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: "Missing Supabase credentials" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const results = {
    nudge_counts_reset: false,
    errors: [] as string[],
  };

  try {
    // Reset daily nudge counts using the SQL function
    const { error: nudgeError } = await supabase.rpc("reset_daily_nudge_counts");

    if (nudgeError) {
      results.errors.push(`Failed to reset nudge counts: ${nudgeError.message}`);
    } else {
      results.nudge_counts_reset = true;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    results.errors.push(`Unexpected error: ${message}`);
  }

  return NextResponse.json({
    ok: results.errors.length === 0,
    ...results,
    timestamp: new Date().toISOString(),
  });
}

// Also allow GET for manual testing (still requires auth)
export async function GET(request: Request) {
  return POST(request);
}
