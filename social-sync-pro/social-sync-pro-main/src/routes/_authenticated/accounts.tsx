import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { useSuspenseQuery, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listConnectedAccounts,
  stubConnectAccount,
  disconnectAccount,
} from "@/lib/accounts.functions";
import { PLATFORM_META, PLATFORMS, type Platform } from "@/lib/platform-constraints";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Plug, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const acctsQO = queryOptions({ queryKey: ["accounts"], queryFn: () => listConnectedAccounts() });

export const Route = createFileRoute("/_authenticated/accounts")({
  loader: ({ context }) => context.queryClient.ensureQueryData(acctsQO),
  head: () => ({ meta: [{ title: "Accounts · Broadcast" }] }),
  component: () => (
    <Suspense fallback={<div className="text-muted-foreground">Loading…</div>}>
      <Inner />
    </Suspense>
  ),
});

const SETUP_NOTES: Record<Platform, string> = {
  linkedin:
    "Real LinkedIn OAuth requires a LinkedIn Developer app with `w_member_social` scope. Once you're ready, we'll wire the flow and store the token encrypted.",
  twitter:
    "Real X (Twitter) OAuth requires an X Developer account with a Free/Basic tier project and `tweet.write` scope.",
  instagram:
    "Instagram publishing goes through the Meta Graph API and requires a Business IG account linked to a Facebook Page (plus a Meta developer app).",
};

function Inner() {
  const qc = useQueryClient();
  const { data: accounts } = useSuspenseQuery(acctsQO);

  const [dialogFor, setDialogFor] = useState<Platform | null>(null);
  const [handle, setHandle] = useState("");

  const connect = useMutation({
    mutationFn: (p: { platform: Platform; displayName: string }) =>
      stubConnectAccount({ data: { platform: p.platform, displayName: p.displayName } }),
    onSuccess: () => {
      toast.success("Connected (demo)");
      setDialogFor(null);
      setHandle("");
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disc = useMutation({
    mutationFn: (platform: Platform) => disconnectAccount({ data: { platform } }),
    onSuccess: () => {
      toast.success("Disconnected");
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Accounts</h1>
        <p className="text-sm text-muted-foreground">
          Connect the networks you publish to. Real OAuth flows plug in here once developer apps are
          configured.
        </p>
      </header>

      <div className="rounded-md border border-warning/40 bg-warning/10 p-4 text-sm text-warning-foreground">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <p className="font-medium">Demo connect mode</p>
            <p className="text-xs text-muted-foreground">
              For now, connecting a platform marks it as ready so you can test posting end-to-end.
              Real OAuth against each provider requires a developer app on their side.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLATFORMS.map((p) => {
          const meta = PLATFORM_META[p];
          const acct = accounts.find((a) => a.platform === p);
          const connected = !!acct?.connected;
          return (
            <Card key={p} className="surface-card">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block size-3 rounded-full"
                    style={{ background: meta.colorVar }}
                  />
                  <CardTitle className="text-base">{meta.label}</CardTitle>
                </div>
                <CardDescription>{meta.charLimit} character limit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  {connected ? (
                    <>
                      <CheckCircle2 className="size-4 text-success" />
                      <span className="text-foreground">{acct?.display_name ?? "Connected"}</span>
                    </>
                  ) : (
                    <>
                      <Plug className="size-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Not connected</span>
                    </>
                  )}
                </div>
                {connected ? (
                  <Button variant="outline" className="w-full" onClick={() => disc.mutate(p)}>
                    Disconnect
                  </Button>
                ) : (
                  <Button className="w-full" onClick={() => setDialogFor(p)}>
                    Connect {meta.label}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!dialogFor} onOpenChange={(o) => !o && setDialogFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {dialogFor ? PLATFORM_META[dialogFor].label : ""}</DialogTitle>
            <DialogDescription>{dialogFor ? SETUP_NOTES[dialogFor] : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="handle">Display name / handle</Label>
            <Input
              id="handle"
              placeholder="@yourhandle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              maxLength={80}
            />
            <p className="text-xs text-muted-foreground">
              This is just a label so you can tell accounts apart. No token is stored in demo mode.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogFor(null)}>
              Cancel
            </Button>
            <Button
              disabled={!handle.trim() || connect.isPending}
              onClick={() =>
                dialogFor && connect.mutate({ platform: dialogFor, displayName: handle.trim() })
              }
            >
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
