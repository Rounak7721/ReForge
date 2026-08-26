-- Bonus — cache the generated starter site.
--
-- Applied to the remote project via the Supabase MCP. Kept in the repo so the
-- schema is reviewable in git rather than existing only in the dashboard.

-- One nullable text column, not a new table. The generated site is a single
-- self-contained HTML document with exactly one current version per project:
-- there is no history to model, no rows to join, and no second entity. A
-- `generated_sites` table would be a foreign key and a join for a value that
-- is 1:1 with the project and always fetched alongside it.
--
-- Nullable because most projects will never have one. A project with an
-- analysis and a concept but no generated site is the normal state, not a
-- partial one, so there is no default and no backfill.
--
-- Existing RLS on `projects` covers this automatically: the policies are
-- row-scoped on `user_id`, not column-scoped, so the new column inherits them
-- with no policy change. That is worth stating explicitly — a new column
-- silently inheriting the wrong policy is exactly how data leaks.
alter table public.projects
  add column if not exists generated_html text;

comment on column public.projects.generated_html is
  'A complete, self-contained HTML document generated from the concept. Rendered in a sandboxed iframe; never served from our own origin.';
