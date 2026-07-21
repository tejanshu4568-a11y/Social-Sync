import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense } from "react";
import { listPosts } from "@/lib/posts.functions";
import { listConnectedAccounts } from "@/lib/accounts.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PLATFORM_META, type Platform } from "@/lib/platform-constraints";
import {
  PencilLine,
  Calendar,
  Link2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const postsQO = queryOptions({ queryKey: ["posts"], queryFn: () => listPosts() });
const acctsQO = queryOptions({ queryKey: ["accounts"], queryFn: () => listConnectedAccounts() });

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(postsQO),
      context.queryClient.ensureQueryData(acctsQO),
    ]),
  head: () => ({ meta: [{ title: "Dashboard · Broadcast" }] }),
  component: Dashboard,
});

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: LucideIcon }> = {
    PUBLISHED: { label: "Published", cls: "bg-success/15 text-success", icon: CheckCircle2 },
    SCHEDULED: { label: "Scheduled", cls: "bg-primary/15 text-primary", icon: Clock },
    PUBLISHING: { label: "Publishing", cls: "bg-warning/15 text-warning", icon: Clock },
    FAILED: { label: "Failed", cls: "bg-destructive/15 text-destructive", icon: AlertTriangle },
    DRAFT: { label: "Draft", cls: "bg-muted text-muted-foreground", icon: PencilLine },
  };
  const s = map[status] ?? map.DRAFT;
  const Icon = s.icon;
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium " + s.cls
      }
    >
      <Icon className="size-3" />
      {s.label}
    </span>
  );
}

function Dashboard() {
  return (
    <Suspense fallback={<div className="text-muted-foreground">Loading…</div>}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const { data: posts } = useSuspenseQuery(postsQO);
  const { data: accounts } = useSuspenseQuery(acctsQO);

  const connectedCount = accounts.filter((a) => a.connected).length;
  const scheduledCount = posts.filter((p) => p.status === "SCHEDULED").length;
  const publishedThisWeek = posts.filter(
    (p) =>
      p.status === "PUBLISHED" &&
      p.published_at &&
      Date.now() - new Date(p.published_at).getTime() < 7 * 864e5,
  ).length;

  const upcoming = posts.filter((p) => p.status === "SCHEDULED").slice(0, 5);
  const recent = posts.slice(0, 8);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">A quick pulse on your publishing.</p>
        </div>
        <Button asChild>
          <Link to="/composer">
            <PencilLine className="size-4" />
            New post
          </Link>
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="surface-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Published this week
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{publishedThisWeek}</CardContent>
        </Card>
        <Card className="surface-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Scheduled</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{scheduledCount}</CardContent>
        </Card>
        <Card className="surface-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Connected networks
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {connectedCount}
            <span className="text-base font-normal text-muted-foreground"> / 3</span>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="surface-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Upcoming</CardTitle>
            <Link to="/calendar" className="text-xs text-muted-foreground hover:text-foreground">
              View calendar →
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing scheduled yet.</p>
            )}
            {upcoming.map((p) => (
              <div key={p.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {(p.target_platforms as Platform[]).map((pl) => (
                      <span
                        key={pl}
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ background: PLATFORM_META[pl].colorVar, color: "white" }}
                      >
                        {PLATFORM_META[pl].label}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    in {p.scheduled_for ? formatDistanceToNow(new Date(p.scheduled_for)) : "—"}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm">{p.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="surface-card">
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Your posts will show up here.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{p.content || "(empty)"}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <StatusPill status={p.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {connectedCount < 3 && (
        <div className="surface-card flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm font-medium">Connect the rest of your networks</p>
            <p className="text-xs text-muted-foreground">
              You have {connectedCount} of 3 connected. Add the others to publish everywhere in one
              click.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/accounts">
              <Link2 className="size-4" />
              Manage accounts
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
