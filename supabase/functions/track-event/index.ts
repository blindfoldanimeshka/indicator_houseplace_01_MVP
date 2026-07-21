// Edge Function: funnel event sink.
// Accepts { event_type, payload } from an authenticated client.
// The user is resolved from the forwarded Authorization JWT (never trusted client-side).
// Events are written with service_role so the client cannot forge user_id or event_type.

import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED = new Set([
  "view_listing",
  "open_chat",
  "send_message",
  "create_listing",
  "complete_deal",
  "boost_listing",
]);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { event_type?: string; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const eventType = body.event_type;
  if (typeof eventType !== "string" || !ALLOWED.has(eventType)) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_event_type" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { error } = await supabase.from("funnel_events").insert({
    user_id: userData.user.id,
    event_type: eventType,
    payload: body.payload ?? null,
  });

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
