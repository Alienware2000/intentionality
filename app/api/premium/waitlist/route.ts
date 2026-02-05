// =============================================================================
// PREMIUM WAITLIST API
// POST endpoint to add users to the premium feature waitlist.
// GET endpoint to check if user is already on the waitlist.
// =============================================================================

import { withAuth, successResponse, ApiErrors, parseJsonBody } from "@/app/lib/auth-middleware";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type WaitlistBody = {
  email: string;
  features_interested?: string[];
  source?: string;
};

// -----------------------------------------------------------------------------
// GET Handler
// Check if user is on the waitlist
// -----------------------------------------------------------------------------

export const GET = withAuth(async ({ user, supabase }) => {
  try {
    const { data: entry, error } = await supabase
      .from("premium_waitlist")
      .select("id, email, features_interested, source, created_at")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = "no rows returned" - this is fine, user not on waitlist
      console.error("Failed to check waitlist:", error);
      return ApiErrors.serverError("Failed to check waitlist status");
    }

    return successResponse({
      onWaitlist: !!entry,
      entry: entry || null,
    });
  } catch (error) {
    console.error("Error checking waitlist:", error);
    return ApiErrors.serverError("Failed to check waitlist status");
  }
});

// -----------------------------------------------------------------------------
// POST Handler
// Add user to the waitlist
// -----------------------------------------------------------------------------

export const POST = withAuth(async ({ user, supabase, request }) => {
  const body = await parseJsonBody<WaitlistBody>(request);

  if (!body?.email) {
    return ApiErrors.badRequest("email is required");
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.email)) {
    return ApiErrors.badRequest("Invalid email format");
  }

  try {
    // Check if already on waitlist by email
    const { data: existing } = await supabase
      .from("premium_waitlist")
      .select("id")
      .eq("email", body.email.toLowerCase())
      .single();

    if (existing) {
      // Update existing entry with new features if user adds more
      if (body.features_interested?.length) {
        const { error: updateError } = await supabase
          .from("premium_waitlist")
          .update({
            features_interested: body.features_interested,
            user_id: user.id, // Link to user if not already
          })
          .eq("id", existing.id);

        if (updateError) {
          console.error("Failed to update waitlist entry:", updateError);
        }
      }

      return successResponse({
        message: "Already on waitlist",
        alreadyOnWaitlist: true,
      });
    }

    // Insert new waitlist entry
    const { error: insertError } = await supabase
      .from("premium_waitlist")
      .insert({
        user_id: user.id,
        email: body.email.toLowerCase(),
        features_interested: body.features_interested || [],
        source: body.source || "upgrade_modal",
      });

    if (insertError) {
      // Handle unique constraint violation (race condition)
      if (insertError.code === "23505") {
        return successResponse({
          message: "Already on waitlist",
          alreadyOnWaitlist: true,
        });
      }
      console.error("Failed to add to waitlist:", insertError);
      return ApiErrors.serverError("Failed to join waitlist");
    }

    return successResponse({
      message: "Successfully joined waitlist!",
      alreadyOnWaitlist: false,
    });
  } catch (error) {
    console.error("Error adding to waitlist:", error);
    return ApiErrors.serverError("Failed to join waitlist");
  }
});
