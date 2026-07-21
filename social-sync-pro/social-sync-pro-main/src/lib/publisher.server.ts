// Server-only publisher. Fans out to per-platform adapters with Promise.allSettled
// so a failure on one platform never blocks the others.
//
// TODO(oauth): Real API calls require configured developer apps on each platform.
// Each adapter currently simulates a network call and records a stub result row.

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { PLATFORM_META, type Platform } from "./platform-constraints";

interface PostRow {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  target_platforms: Platform[];
}

interface PlatformResult {
  platform: Platform;
  status: "SUCCESS" | "FAILED";
  externalId?: string;
  error?: string;
}

async function publishToLinkedIn(post: PostRow): Promise<PlatformResult> {
  // TODO: POST https://api.linkedin.com/v2/posts with the user's decrypted OAuth token.
  await new Promise((r) => setTimeout(r, 400));
  return { platform: "linkedin", status: "SUCCESS", externalId: `li_${crypto.randomUUID()}` };
}

async function publishToTwitter(post: PostRow): Promise<PlatformResult> {
  // TODO: POST https://api.twitter.com/2/tweets with the user's decrypted OAuth token.
  await new Promise((r) => setTimeout(r, 300));
  return { platform: "twitter", status: "SUCCESS", externalId: `tw_${crypto.randomUUID()}` };
}

async function publishToInstagram(post: PostRow): Promise<PlatformResult> {
  // TODO: Meta Graph API /{ig-user-id}/media then /media_publish with a business IG account.
  await new Promise((r) => setTimeout(r, 500));
  return { platform: "instagram", status: "SUCCESS", externalId: `ig_${crypto.randomUUID()}` };
}

const PUBLISHERS: Record<Platform, (p: PostRow) => Promise<PlatformResult>> = {
  linkedin: publishToLinkedIn,
  twitter: publishToTwitter,
  instagram: publishToInstagram,
};

export async function publishPostById(postId: string) {
  const { data: post, error } = await supabaseAdmin
    .from("posts")
    .select("*")
    .eq("id", postId)
    .single();
  if (error || !post) throw new Error(error?.message ?? "post not found");

  await supabaseAdmin.from("posts").update({ status: "PUBLISHING" }).eq("id", post.id);

  const platforms = post.target_platforms as Platform[];
  const settled = await Promise.allSettled(
    platforms.map(async (p) => {
      // Verify the user has connected this platform.
      const { data: acct } = await supabaseAdmin
        .from("connected_accounts")
        .select("connected")
        .eq("user_id", post.user_id)
        .eq("platform", p)
        .maybeSingle();
      if (!acct?.connected) {
        return {
          platform: p,
          status: "FAILED" as const,
          error: `${PLATFORM_META[p].label} account not connected`,
        };
      }
      return PUBLISHERS[p](post as PostRow);
    }),
  );

  const results: PlatformResult[] = settled.map((s, i) =>
    s.status === "fulfilled"
      ? s.value
      : { platform: platforms[i], status: "FAILED", error: String(s.reason?.message ?? s.reason) },
  );

  await supabaseAdmin.from("post_results").insert(
    results.map((r) => ({
      post_id: post.id,
      user_id: post.user_id,
      platform: r.platform,
      status: r.status === "SUCCESS" ? "SUCCESS" : "FAILED",
      external_id: r.externalId ?? null,
      error: r.error ?? null,
      published_at: r.status === "SUCCESS" ? new Date().toISOString() : null,
    })),
  );

  const allOk = results.every((r) => r.status === "SUCCESS");
  const anyOk = results.some((r) => r.status === "SUCCESS");

  await supabaseAdmin
    .from("posts")
    .update({
      status: allOk ? "PUBLISHED" : anyOk ? "PUBLISHED" : "FAILED",
      published_at: anyOk ? new Date().toISOString() : null,
      error: allOk
        ? null
        : results
            .filter((r) => r.error)
            .map((r) => `${r.platform}: ${r.error}`)
            .join("; "),
    })
    .eq("id", post.id);

  return results;
}
