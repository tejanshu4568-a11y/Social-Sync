import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Radio, Send, Calendar, Layers, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Broadcast — Publish to LinkedIn, X and Instagram from one place" },
      {
        name: "description",
        content:
          "Compose once, schedule everywhere. A minimal studio for teams that plan their social presence across LinkedIn, X and Instagram.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  return (
    <div className="min-h-screen bg-background bg-hero">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-gradient shadow-glow">
            <Radio className="size-4 text-primary-foreground" />
          </span>
          Broadcast
        </div>
        <nav className="flex items-center gap-2">
          {signedIn ? (
            <Button asChild>
              <Link to="/dashboard">Open studio</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild>
                <Link to="/auth" search={{ mode: "signup" }}>
                  Get started
                </Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="mx-auto max-w-3xl pt-16 pb-24 text-center sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="size-3.5 text-primary" />
            One studio. Three networks. Zero context switching.
          </span>
          <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
            Compose once. <span className="text-brand-gradient">Broadcast</span> everywhere.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Plan, schedule and publish to LinkedIn, X and Instagram from a single clean composer —
            with live per-platform character counts and reliable delivery on your schedule.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth" search={{ mode: "signup" }}>
                Start publishing free
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 pb-24 sm:grid-cols-3">
          {[
            {
              icon: Send,
              title: "Unified composer",
              body: "Live character counts per network, image uploads, and hashtag helpers built in.",
            },
            {
              icon: Calendar,
              title: "Reliable scheduler",
              body: "Queue posts weeks ahead. Durable delivery — your posts go out even if your laptop is closed.",
            },
            {
              icon: Layers,
              title: "Per-platform results",
              body: "See exactly which networks published, which failed, and why — in one place.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="surface-card p-6">
              <Icon className="size-5 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-muted-foreground">
          Broadcast · Built for teams that ship consistently.
        </div>
      </footer>
    </div>
  );
}
