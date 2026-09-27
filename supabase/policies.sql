-- Only logged-in users can read/write. Disable sign-ups in Supabase Auth settings so that's only you.
do $$
declare t text;
begin
  foreach t in array array['settings', 'exercises', 'day_templates', 'treadmill_templates',
                           'sessions', 'set_logs', 'cardio_logs', 'stretch_logs']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy owner_all on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
