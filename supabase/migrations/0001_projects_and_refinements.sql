-- Phase 1 — projects + refinements, with RLS scoped to auth.uid().
--
-- Applied to the remote project via the Supabase MCP. Kept in the repo so the
-- schema is reviewable in git rather than existing only in the dashboard.

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER, not DEFINER: this only stamps NEW.updated_at and needs no
-- elevated privileges. It was originally created as DEFINER, which Supabase's
-- advisor flagged because PostgREST then exposed it as an anon-callable RPC.
-- Migration 0002 remediated the live project; corrected here too so that
-- re-running this file alone cannot reintroduce it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,

  url             text not null,
  description     text not null,
  target_customer text not null,

  -- Both nullable: a project exists from creation, before either LLM call runs.
  -- Shapes are enforced by zod at the application boundary, not by Postgres.
  analysis        jsonb,
  concept         jsonb,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Every dashboard read filters by owner.
create index if not exists projects_user_id_created_at_idx
  on public.projects (user_id, created_at desc);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- refinements — chat history + an audit trail of how the concept evolved
-- ---------------------------------------------------------------------------
create table if not exists public.refinements (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,

  instruction   text not null,
  -- Snapshot of the concept this instruction produced. Makes undo a matter of
  -- restoring the previous row, and gives the UI a real history to render.
  concept_after jsonb,

  created_at    timestamptz not null default now()
);

create index if not exists refinements_project_id_created_at_idx
  on public.refinements (project_id, created_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- RLS is what actually enforces ownership; the Next.js middleware is only UX.
-- Policies are per-command rather than `for all` so the intent of each is
-- explicit and an over-broad USING clause can't silently widen a write path.
-- ---------------------------------------------------------------------------
alter table public.projects    enable row level security;
alter table public.refinements enable row level security;

-- projects: owner-only, compared directly against user_id.
-- (select auth.uid()) rather than a bare call so Postgres caches it per
-- statement instead of re-evaluating per row.
drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own" on public.projects
  for select using ((select auth.uid()) = user_id);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own" on public.projects
  for update using ((select auth.uid()) = user_id)
          with check ((select auth.uid()) = user_id);

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own" on public.projects
  for delete using ((select auth.uid()) = user_id);

-- refinements: no user_id of its own, so ownership is proven through the
-- parent project. WITH CHECK on insert stops a user attaching a refinement to
-- someone else's project.
drop policy if exists "refinements_select_own" on public.refinements;
create policy "refinements_select_own" on public.refinements
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = refinements.project_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "refinements_insert_own" on public.refinements;
create policy "refinements_insert_own" on public.refinements
  for insert with check (
    exists (
      select 1 from public.projects p
      where p.id = refinements.project_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "refinements_delete_own" on public.refinements;
create policy "refinements_delete_own" on public.refinements
  for delete using (
    exists (
      select 1 from public.projects p
      where p.id = refinements.project_id
        and p.user_id = (select auth.uid())
    )
  );

-- No update policy on refinements: history is append-only by design.
