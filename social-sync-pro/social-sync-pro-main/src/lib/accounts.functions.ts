// Data access for connected accounts. See posts.functions.ts for why this
// calls Supabase directly from the browser instead of using server functions.
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const platformEnum = z.enum(["linkedin", "twitter", "instagram"]);

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not signed in");
  return data.user.id;
}

export async function listConnectedAccounts() {
  const { data, error } = await supabase
    .from("connected_accounts")
    .select("id, platform, display_name, connected, token_expires_at, created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Stub: pretend to connect a platform. Real OAuth flow plugs in here later.
export async function stubConnectAccount(opts: {
  data: { platform: "linkedin" | "twitter" | "instagram"; displayName: string };
}) {
  const data = z
    .object({ platform: platformEnum, displayName: z.string().trim().min(1).max(80) })
    .parse(opts.data);
  const userId = await currentUserId();

  const { error } = await supabase.from("connected_accounts").upsert(
    {
      user_id: userId,
      platform: data.platform,
      display_name: data.displayName,
      connected: true,
    },
    { onConflict: "user_id,platform" },
  );
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function disconnectAccount(opts: {
  data: { platform: "linkedin" | "twitter" | "instagram" };
}) {
  const data = z.object({ platform: platformEnum }).parse(opts.data);
  const userId = await currentUserId();

  const { error } = await supabase
    .from("connected_accounts")
    .update({ connected: false, access_token_ciphertext: null, refresh_token_ciphertext: null })
    .eq("user_id", userId)
    .eq("platform", data.platform);
  if (error) throw new Error(error.message);
  return { ok: true };
}
