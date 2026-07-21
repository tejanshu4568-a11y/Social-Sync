import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClientOnlyFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createPost } from "@/lib/posts.functions";
import { PLATFORM_META, PLATFORMS, type Platform } from "@/lib/platform-constraints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ImagePlus, Send, Clock, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/composer")({
  head: () => ({ meta: [{ title: "Composer · Broadcast" }] }),
  component: Composer,
});

// GitHub Pages has no server, so "post now" publishing is simulated in the
// browser (see publisher.client.ts) instead of on a trusted server. Wrapped
// with createClientOnlyFn so this browser-only module never ends up in the
// SSR/prerender bundle that TanStack Start's SPA mode still builds.
const triggerPublish = createClientOnlyFn((postId: string) =>
  import("@/lib/publisher.client").then(({ publishPostById }) => publishPostById(postId)),
);

function Composer() {
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [selected, setSelected] = useState<Platform[]>(["linkedin", "twitter"]);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [scheduledFor, setScheduledFor] = useState("");
  const [uploading, setUploading] = useState(false);

  const mutation = useMutation({
    mutationFn: (mode: "now" | "schedule") =>
      createPost({
        data: {
          content: content.trim(),
          mediaUrls,
          targetPlatforms: selected,
          scheduledFor:
            mode === "schedule" && scheduledFor ? new Date(scheduledFor).toISOString() : null,
        },
      }),
    onSuccess: (row) => {
      toast.success("Post queued");
      setContent("");
      setMediaUrls([]);
      setScheduledFor("");
      qc.invalidateQueries({ queryKey: ["posts"] });

      if (row.status === "PUBLISHING") {
        triggerPublish(row.id)
          ?.catch((e) => console.error("publish failed", e))
          .finally(() => qc.invalidateQueries({ queryKey: ["posts"] }));
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const overLimit = useMemo(
    () => selected.filter((p) => content.length > PLATFORM_META[p].charLimit),
    [content, selected],
  );

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      const path = `${uid}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage
        .from("post-media")
        .upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: signed } = await supabase.storage
        .from("post-media")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      if (signed?.signedUrl) setMediaUrls((m) => [...m, signed.signedUrl]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const canSubmit =
    content.trim().length > 0 &&
    selected.length > 0 &&
    overLimit.length === 0 &&
    !mutation.isPending;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Composer</h1>
          <p className="text-sm text-muted-foreground">Write once. Adapt for each network. Ship.</p>
        </header>

        <Card className="surface-card">
          <CardContent className="space-y-4 pt-6">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What do you want to say?"
              rows={10}
              className="min-h-[240px] resize-y bg-background text-base"
            />
            {mediaUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {mediaUrls.map((u, i) => (
                  <div key={u} className="relative">
                    <img
                      src={u}
                      alt=""
                      className="size-24 rounded-md border border-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setMediaUrls((m) => m.filter((_, idx) => idx !== i))}
                      className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-destructive text-destructive-foreground"
                      aria-label="Remove"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-secondary">
                  <ImagePlus className="size-4" />
                  {uploading ? "Uploading…" : "Add image"}
                  <input type="file" accept="image/*" hidden onChange={onUpload} />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="sched" className="text-xs text-muted-foreground">
                    Schedule
                  </Label>
                  <Input
                    id="sched"
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="w-56"
                  />
                </div>
                {scheduledFor ? (
                  <Button disabled={!canSubmit} onClick={() => mutation.mutate("schedule")}>
                    <Clock className="size-4" />
                    Schedule
                  </Button>
                ) : (
                  <Button disabled={!canSubmit} onClick={() => mutation.mutate("now")}>
                    <Send className="size-4" />
                    Post now
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card className="surface-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Target networks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {PLATFORMS.map((p) => {
              const meta = PLATFORM_META[p];
              const on = selected.includes(p);
              const remaining = meta.charLimit - content.length;
              const over = remaining < 0;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    setSelected((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]))
                  }
                  className={
                    "flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors " +
                    (on
                      ? "border-primary/50 bg-primary/5"
                      : "border-border hover:border-primary/30")
                  }
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block size-3 rounded-full"
                      style={{ background: meta.colorVar }}
                    />
                    <div>
                      <div className="text-sm font-medium">{meta.label}</div>
                      <div className="text-[11px] text-muted-foreground">{meta.hashtagHint}</div>
                    </div>
                  </div>
                  <div
                    className={
                      "text-xs font-medium " + (over ? "text-destructive" : "text-muted-foreground")
                    }
                  >
                    {remaining}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {overLimit.length > 0 && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            Over limit for {overLimit.map((p) => PLATFORM_META[p].label).join(", ")}.
          </div>
        )}
      </aside>
    </div>
  );
}
