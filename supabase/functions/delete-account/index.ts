// supabase/functions/delete-account/index.ts
//
// Deletes the CALLING user's own account: their supplier/customer data
// across every table, then their Supabase Auth user (which also removes
// their email — after this they could sign up again with the same email).
//
// This must run as an Edge Function (not client-side) because deleting an
// Auth user requires the service role key, which must never be shipped to
// the browser. Deploy with:
//
//   supabase functions deploy delete-account
//
// and set the (auto-provided) env vars are already available to Edge
// Functions by default: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client scoped to the caller's own JWT — used only to figure out who's calling.
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_ANON_KEY"),
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Admin client with the service role key — allowed to delete any row and any auth user.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    // Find the supplier/customer profile rows for this user, since a lot of
    // other tables reference the *profile* id rather than the auth user id.
    const { data: supplierProfile } = await admin
      .from("supplier_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    const { data: customerProfile } = await admin
      .from("customer_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    const supplierProfileId = supplierProfile?.id;
    const customerProfileId = customerProfile?.id;

    // Delete dependent data first (children before parents), ignoring
    // "no rows" — every call below is safe to run even if that table/column
    // doesn't apply to this user.
    const del = async (table, column, value) => {
      if (!value) return;
      const { error } = await admin.from(table).delete().eq(column, value);
      if (error) console.error(`delete-account: failed clearing ${table}.${column}`, error);
    };

    await Promise.all([
      del("bills", "supplier_user_id", userId),
      del("bills", "customer_user_id", userId),
      del("orders", "supplier_user_id", userId),
      del("orders", "customer_user_id", userId),
      del("notifications", "user_id", userId),
      del("reviews", "supplier_user_id", userId),
      del("reviews", "customer_user_id", userId),
      del("products", "supplier_user_id", userId),
    ]);

    await Promise.all([
      del("supplier_links", "supplier_user_id", userId),
      del("supplier_links", "customer_user_id", userId),
    ]);

    await Promise.all([
      supplierProfileId ? del("supplier_profiles", "id", supplierProfileId) : Promise.resolve(),
      customerProfileId ? del("customer_profiles", "id", customerProfileId) : Promise.resolve(),
      del("profiles", "id", userId),
    ]);

    // Finally, delete the Auth user itself — this frees up the email
    // address and is irreversible.
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
    if (deleteUserError) throw deleteUserError;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("delete-account error:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to delete account" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
