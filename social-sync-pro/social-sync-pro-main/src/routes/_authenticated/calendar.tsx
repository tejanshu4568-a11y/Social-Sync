import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { Suspense } from "react";
import { listPosts, deletePost } from "@/lib/posts.functions";
import { PLATFORM_META, type Platform } from "@/lib/platform-constraints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const postsQO = queryOptions({ queryKey: ["posts"], queryFn: () => listPosts() });

export const Route = createFileRoute("/_authenticated/calendar")({
  loader: ({ context }) => context.queryClient.ensureQueryData(postsQO),
  head: () => ({ meta: [{ title: "Calendar · Broadcast" }] }),
  component: () => (
    <Suspense fallback={<div className="text-muted-foreground">Loading…</div>}>
      <Inner />
    </Suspense>
  ),
});

function Inner() {
  const { data: posts } = useSuspenseQuery(postsQO);
  const qc = useQueryClient();

  const del = useMutation({
    mutationFn: (id: string) => deletePost({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const groups = {
    scheduled: posts.filter((p) => p.status === "SCHEDULED"),
    publishing: posts.filter((p) => p.status === "PUBLISHING"),
    published: posts.filter((p) => p.status === "PUBLISHED"),
    failed: posts.filter((p) => p.status === "FAILED"),
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Calendar</h1>
        <p className="text-sm text-muted-foreground">Everything you have in flight.</p>
      </header>

      {(["scheduled", "publishing", "published", "failed"] as const).map((key) => (
        <section key={key}>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {key} · {groups[key].length}
          </h2>
          {groups[key].length === 0 ? (
            <p className="text-sm text-muted-foreground/70">Nothing here.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {groups[key].map((p) => (
                <Card key={p.id} className="surface-card">
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div className="flex flex-wrap gap-1">
                      {(p.target_platforms as Platform[]).map((pl) => (
                        <span
                          key={pl}
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                          style={{ background: PLATFORM_META[pl].colorVar }}
                        >
                          {PLATFORM_META[pl].label}
                        </span>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => del.mutate(p.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="line-clamp-3 text-sm">{p.content}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.scheduled_for
                        ? `Scheduled ${format(new Date(p.scheduled_for), "PP · p")}`
                        : p.published_at
                          ? `Published ${format(new Date(p.published_at), "PP · p")}`
                          : `Created ${format(new Date(p.created_at), "PP · p")}`}
                    </p>
                    {p.error && <p className="text-xs text-destructive">{p.error}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
