-- The original design ran the "publish" fan-out on a trusted server using the
-- service-role key, so only that server could write post_results. Static
-- hosting (GitHub Pages) has no server to run that on, so the simulated
-- publish now runs in the browser instead, using the normal (RLS-scoped)
-- client. These policies let a signed-in user write results for their own
-- posts only.
--
-- This is safe ONLY because publishing is currently a simulation (fake
-- delay, fake external IDs — see src/lib/publisher.client.ts). No real
-- OAuth tokens or third-party API calls are involved yet. If you wire up
-- real publishing later, move result-writing back behind a trusted server
-- (e.g. a Supabase Edge Function using the service-role key) and DROP these
-- two policies so a user's browser can no longer mark their own posts as
-- published.
CREATE POLICY "Users write own post results" ON public.post_results FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own post results" ON public.post_results FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
