// =============================================================================
// GROUPS WEEKLY RESET CRON API
// Scheduled to run Monday 00:00 UTC.
// Archives last week's results, awards XP bonuses, and creates new challenges.
//
// This endpoint should be called by a cron service (e.g., Vercel Cron, GitHub Actions).
// It requires a CRON_SECRET environment variable for authentication.
// =============================================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWeekStartUTC, getLastWeekRangeUTC } from "@/app/lib/date-utils";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const XP_BONUSES = {
  first: 25,
  second: 15,
  third: 10,
};

// -----------------------------------------------------------------------------
// POST /api/cron/groups-weekly-reset
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

  const lastWeek = getLastWeekRangeUTC();
  const thisWeekStart = getWeekStartUTC();

  // Get all groups
  const { data: groups, error: groupsError } = await supabase
    .from("groups")
    .select("id, name, member_count");

  if (groupsError) {
    return NextResponse.json(
      { error: `Failed to fetch groups: ${groupsError.message}` },
      { status: 500 }
    );
  }

  const results = {
    groups_processed: 0,
    history_created: 0,
    challenges_created: 0,
    xp_bonuses_awarded: 0,
    errors: [] as string[],
  };

  for (const group of groups ?? []) {
    try {
      results.groups_processed++;

      // Get top 3 members by weekly_xp
      const { data: topMembers } = await supabase
        .from("group_members")
        .select("user_id, weekly_xp")
        .eq("group_id", group.id)
        .gt("weekly_xp", 0)
        .order("weekly_xp", { ascending: false })
        .limit(3);

      // Calculate totals
      const { data: allMembers } = await supabase
        .from("group_members")
        .select("weekly_xp")
        .eq("group_id", group.id);

      const totalXp = allMembers?.reduce((sum, m) => sum + (m.weekly_xp ?? 0), 0) ?? 0;
      const participantCount = allMembers?.filter((m) => (m.weekly_xp ?? 0) > 0).length ?? 0;

      // Only create history if there was activity
      if (participantCount > 0) {
        // Check if history already exists for this week
        const { data: existingHistory } = await supabase
          .from("group_weekly_history")
          .select("id")
          .eq("group_id", group.id)
          .eq("week_start", lastWeek.start)
          .single();

        if (!existingHistory) {
          // Create history entry
          const historyEntry = {
            group_id: group.id,
            week_start: lastWeek.start,
            week_end: lastWeek.end,
            first_place_user_id: topMembers?.[0]?.user_id ?? null,
            first_place_xp: topMembers?.[0]?.weekly_xp ?? 0,
            second_place_user_id: topMembers?.[1]?.user_id ?? null,
            second_place_xp: topMembers?.[1]?.weekly_xp ?? null,
            third_place_user_id: topMembers?.[2]?.user_id ?? null,
            third_place_xp: topMembers?.[2]?.weekly_xp ?? null,
            total_group_xp: totalXp,
            participant_count: participantCount,
          };

          const { error: historyError } = await supabase
            .from("group_weekly_history")
            .insert(historyEntry);

          if (historyError) {
            results.errors.push(`Group ${group.id}: Failed to create history - ${historyError.message}`);
          } else {
            results.history_created++;
          }

          // Award XP bonuses and send notifications to winners
          const winners = [
            { user: topMembers?.[0], bonus: XP_BONUSES.first, place: "1st" },
            { user: topMembers?.[1], bonus: XP_BONUSES.second, place: "2nd" },
            { user: topMembers?.[2], bonus: XP_BONUSES.third, place: "3rd" },
          ];

          for (const winner of winners) {
            if (winner.user?.user_id) {
              // Award bonus XP - directly update user_profiles
              const { data: profile } = await supabase
                .from("user_profiles")
                .select("xp_total")
                .eq("user_id", winner.user.user_id)
                .single();

              if (profile) {
                await supabase
                  .from("user_profiles")
                  .update({ xp_total: profile.xp_total + winner.bonus })
                  .eq("user_id", winner.user.user_id);
              }

              results.xp_bonuses_awarded++;

              // Send notification
              await supabase.from("notifications").insert({
                user_id: winner.user.user_id,
                type: "weekly_winner",
                title: `${winner.place} Place!`,
                body: `You finished ${winner.place} in ${group.name} with ${winner.user.weekly_xp} XP! +${winner.bonus} XP bonus`,
                metadata: {
                  group_id: group.id,
                  group_name: group.name,
                  place: winner.place,
                  xp_earned: winner.user.weekly_xp,
                  xp_bonus: winner.bonus,
                },
              });

              // Add activity feed entry for winner
              if (winner.place === "1st") {
                await supabase.from("activity_feed").insert({
                  user_id: winner.user.user_id,
                  activity_type: "weekly_winner",
                  message: `Won ${winner.place} place in ${group.name}!`,
                  metadata: {
                    group_id: group.id,
                    group_name: group.name,
                    xp_earned: winner.user.weekly_xp,
                  },
                  reference_type: "group",
                  reference_id: group.id,
                });
              }
            }
          }
        }
      }

      // Reset weekly_xp for all members
      await supabase
        .from("group_members")
        .update({ weekly_xp: 0 })
        .eq("group_id", group.id);

      // Create new challenge for this week
      const { data: existingChallenge } = await supabase
        .from("group_challenges")
        .select("id")
        .eq("group_id", group.id)
        .eq("week_start", thisWeekStart)
        .single();

      if (!existingChallenge) {
        // Get a random active template
        const { data: templates } = await supabase
          .from("group_challenge_templates")
          .select("*")
          .eq("is_active", true);

        if (templates && templates.length > 0) {
          const template = templates[Math.floor(Math.random() * templates.length)];
          const targetValue = template.target_per_member * group.member_count;

          const { error: challengeError } = await supabase
            .from("group_challenges")
            .insert({
              group_id: group.id,
              week_start: thisWeekStart,
              template_id: template.id,
              name: template.name,
              description: template.description,
              challenge_type: template.challenge_type,
              target_value: targetValue,
              current_progress: 0,
              completed: false,
              xp_reward_per_member: template.xp_reward_per_member,
            });

          if (challengeError) {
            results.errors.push(`Group ${group.id}: Failed to create challenge - ${challengeError.message}`);
          } else {
            results.challenges_created++;
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      results.errors.push(`Group ${group.id}: ${message}`);
    }
  }

  return NextResponse.json({
    ok: true,
    ...results,
    last_week: lastWeek,
    this_week_start: thisWeekStart,
  });
}

// Also allow GET for manual testing (still requires auth)
export async function GET(request: Request) {
  return POST(request);
}
