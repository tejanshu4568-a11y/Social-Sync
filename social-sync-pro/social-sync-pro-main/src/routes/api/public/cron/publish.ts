import { createFileRoute } from "@tanstack/react-router";

// Called every minute by pg_cron. Picks up SCHEDULED posts whose scheduled_for
// has passed and dispatches them through the publisher.
export const Route = createFileRoute("/api/public/cron/publish")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { publishPostById } = await import("@/lib/publisher.server");

        const { data: due, error } = await supabaseAdmin
          .from("posts")
          .select("id")
          .eq("status", "SCHEDULED")
          .lte("scheduled_for", new Date().toISOString())
          .limit(25);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        const results = await Promise.allSettled((due ?? []).map((p) => publishPostById(p.id)));

        return Response.json({
          ok: true,
          picked: due?.length ?? 0,
          succeeded: results.filter((r) => r.status === "fulfilled").length,
          failed: results.filter((r) => r.status === "rejected").length,
        });
      },
      GET: async () => Response.json({ ok: true, message: "publisher cron endpoint" }),
    },
  },
});
