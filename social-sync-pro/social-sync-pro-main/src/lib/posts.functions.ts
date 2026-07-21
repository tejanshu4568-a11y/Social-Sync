// Data access for posts. Originally ran as TanStack Start server functions;
// now calls Supabase directly from the browser so the app works as a static
// site with no server (see README for why). Safe because every table here
// has row-level security scoping reads/writes to the signed-in user's own
// rows — see supabase/migrations.
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PLATFORM_META, type Platform } from "./platform-constraints";

const platformEnum = z.enum(["linkedin", "twitter", "instagram"]);

const createPostSchema = z.object({
  content: z.string().trim().min(1, "Content is required").max(3000),
  mediaUrls: z.array(z.string().url()).max(4).default([]),
  targetPlatforms: z.array(platformEnum).min(1, "Select at least one platform"),
  scheduledFor: z.string().datetime().nullable().optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not signed in");
  return data.user.id;
}

export async function listPosts() {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listPostResults(opts: { data: { postId: string } }) {
  const { data: rows, error } = await supabase
    .from("post_results")
    .select("*")
    .eq("post_id", opts.data.postId);
  if (error) throw new Error(error.message);
  return rows ?? [];
}

export async function createPost(opts: { data: CreatePostInput }) {
  const data = createPostSchema.parse(opts.data);

  // Validate per-platform limits client-side too (in addition to RLS/DB constraints).
  for (const p of data.targetPlatforms) {
    const meta = PLATFORM_META[p as Platform];
    if (data.content.length > meta.charLimit) {
      throw new Error(`${meta.label} limit is ${meta.charLimit} characters`);
    }
    if (meta.requiresMedia && data.mediaUrls.length === 0) {
      throw new Error(`${meta.label} requires at least one image`);
    }
  }

  const userId = await currentUserId();
  const scheduled = data.scheduledFor ? new Date(data.scheduledFor) : null;
  const isFuture = scheduled && scheduled.getTime() > Date.now() + 30_000;
  const status = isFuture ? "SCHEDULED" : "PUBLISHING";

  const { data: row, error } = await supabase
    .from("posts")
    .insert({
      user_id: userId,
      content: data.content,
      media_urls: data.mediaUrls,
      target_platforms: data.targetPlatforms,
      scheduled_for: scheduled?.toISOString() ?? null,
      status,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  // Note: this only writes the post row. "Post now" (status PUBLISHING) still
  // needs publishPostById() called afterwards to actually simulate publishing
  // — the composer does that, since it's client-only browser code (see
  // publisher.client.ts) and doesn't belong in this isomorphic data module.
  return row;
}

export async function deletePost(opts: { data: { id: string } }) {
  const { error } = await supabase.from("posts").delete().eq("id", opts.data.id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
