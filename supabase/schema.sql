create table settings (
  id int primary key default 1 check (id = 1),
  base_mph numeric not null default 5.0,
  push_mph numeric not null default 6.0,
  allout_mph numeric not null default 7.0,
  walk_mph numeric not null default 3.0,
  walker_mph numeric not null default 3.5,
  walker_mode boolean not null default false,
  stair_minutes int not null default 10,
  rotation_index int not null default 0,
  treadmill_index int not null default 0
);

create table exercises (
  id bigint generated always as identity primary key,
  name text not null unique,
  category text not null check (category in ('legs', 'push', 'pull', 'core')),
  equipment text,
  default_sets int not null default 3,
  default_reps int not null default 10
);

create table day_templates (
  id bigint generated always as identity primary key,
  position int not null,
  name text not null,
  exercise_ids bigint[] not null default '{}',
  stretch_items text[] not null default '{}'
);

create table treadmill_templates (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  segments jsonb not null
);

create table sessions (
  id bigint generated always as identity primary key,
  client_id uuid not null unique,
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  day_template_id bigint references day_templates on delete set null,
  day_name text,
  treadmill_template_id bigint references treadmill_templates on delete set null,
  treadmill_name text,
  notes text
);

create table set_logs (
  id bigint generated always as identity primary key,
  session_id bigint not null references sessions on delete cascade,
  exercise_id bigint references exercises on delete set null,
  exercise_name text not null,
  set_no int not null,
  reps int not null,
  weight numeric not null default 0
);
create index on set_logs (exercise_id, session_id);

create table cardio_logs (
  id bigint generated always as identity primary key,
  session_id bigint not null references sessions on delete cascade,
  kind text not null check (kind in ('treadmill', 'stair')),
  duration_min numeric,
  distance_mi numeric,
  floors int,
  level int
);

create table stretch_logs (
  id bigint generated always as identity primary key,
  session_id bigint not null references sessions on delete cascade,
  item text not null,
  done boolean not null default false
);

-- Saves a whole workout atomically; client_id makes retries after a dropped connection idempotent.
create or replace function finish_session(p jsonb) returns bigint
language plpgsql security invoker as $$
declare sid bigint;
begin
  insert into sessions (client_id, started_at, day_template_id, day_name, treadmill_template_id, treadmill_name, notes)
  values (
    (p->>'client_id')::uuid, (p->>'started_at')::timestamptz,
    (p->>'day_template_id')::bigint, p->>'day_name',
    (p->>'treadmill_template_id')::bigint, p->>'treadmill_name',
    nullif(p->>'notes', '')
  )
  on conflict (client_id) do nothing
  returning id into sid;

  if sid is null then
    select id into sid from sessions where client_id = (p->>'client_id')::uuid;
    return sid;
  end if;

  insert into set_logs (session_id, exercise_id, exercise_name, set_no, reps, weight)
  select sid, (x->>'exercise_id')::bigint, x->>'exercise_name', (x->>'set_no')::int, (x->>'reps')::int, (x->>'weight')::numeric
  from jsonb_array_elements(p->'sets') x;

  insert into cardio_logs (session_id, kind, duration_min, distance_mi, floors, level)
  select sid, x->>'kind', (x->>'duration_min')::numeric, (x->>'distance_mi')::numeric, (x->>'floors')::int, (x->>'level')::int
  from jsonb_array_elements(p->'cardio') x;

  insert into stretch_logs (session_id, item, done)
  select sid, x->>'item', (x->>'done')::boolean
  from jsonb_array_elements(p->'stretches') x;

  update settings
  set rotation_index = (p->>'next_rotation_index')::int,
      treadmill_index = (p->>'next_treadmill_index')::int
  where id = 1;

  return sid;
end $$;

revoke execute on function finish_session(jsonb) from public, anon;
grant execute on function finish_session(jsonb) to authenticated;
