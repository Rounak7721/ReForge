-- Supabase's security advisor flagged public.set_updated_at() twice:
--   anon_security_definer_function_executable
--   authenticated_security_definer_function_executable
--
-- It was created SECURITY DEFINER, which meant PostgREST exposed it as a
-- callable RPC at /rest/v1/rpc/set_updated_at, runnable by anon. A trigger
-- function that only stamps NEW.updated_at needs no elevated privileges at
-- all, so this removes both the elevation and the RPC surface.

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

-- Belt and braces: even as SECURITY INVOKER the function stays visible to
-- PostgREST as an RPC. Nothing should call it directly — it only ever runs as
-- a trigger, where EXECUTE is not checked against the caller.
revoke execute on function public.set_updated_at() from public;
revoke execute on function public.set_updated_at() from anon;
revoke execute on function public.set_updated_at() from authenticated;
