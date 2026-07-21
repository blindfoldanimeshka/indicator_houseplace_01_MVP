import { getSupabaseClient } from "@/lib/supabase";

export type FunnelEvent =
  | "view_listing"
  | "open_chat"
  | "send_message"
  | "create_listing"
  | "complete_deal"
  | "boost_listing";

/**
 * Fire-and-forget funnel event. Errors are swallowed (warn only) so analytics
 * never breaks the user's flow. The server validates event_type and stamps
 * the real user_id from the session JWT.
 */
export async function trackEvent(
  eventType: FunnelEvent,
  payload?: Record<string, unknown>,
): Promise<void> {
  try {
    await getSupabaseClient().functions.invoke("track-event", {
      body: { event_type: eventType, payload: payload ?? null },
    });
  } catch (err) {
    console.warn("trackEvent failed", err);
  }
}
