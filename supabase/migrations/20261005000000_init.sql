-- Sentinel Prayer Warriors: initial schema.
-- Public can read published requests. Authors stay private (request_authors is never readable
-- by clients). Every write that matters goes through a security-definer function so moderation
-- cannot be skipped.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text check (char_length(first_name) <= 30),
  is_warrior boolean not null default false,
  is_requester boolean not null default false,
  onboarded boolean not null default false,
  interests text[] not null default '{}',
  lived_experience text[] not null default '{}',
  three_mix smallint not null default 70 check (three_mix between 0 and 100),
  show_guides boolean not null default true,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "read own profile" on public.profiles for select using (id = auth.uid());
create policy "update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Users may not promote themselves to admin.
create function public.protect_admin_flag() returns trigger language plpgsql as $$
begin
  if new.is_admin is distinct from old.is_admin and current_user in ('anon', 'authenticated') then
    raise exception 'is_admin can only be changed by an administrator';
  end if;
  return new;
end $$;
create trigger profiles_protect_admin before update on public.profiles
  for each row execute function public.protect_admin_flag();

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, first_name)
  values (new.id, nullif(split_part(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), ' ', 1), ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- ---------------------------------------------------------------- interests
create table public.interests (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,48}$'),
  label text not null unique check (char_length(label) between 3 and 32),
  status text not null default 'pending' check (status in ('approved', 'pending', 'rejected')),
  suggested_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.interests enable row level security;
create policy "anyone reads approved interests" on public.interests for select using (status = 'approved' or public.is_admin());

insert into public.interests (slug, label, status) values
  ('food-hunger', 'Food & hunger', 'approved'),
  ('housing', 'Housing & shelter', 'approved'),
  ('healing', 'Health & healing', 'approved'),
  ('surgery', 'Surgery & hospital', 'approved'),
  ('cancer', 'Cancer', 'approved'),
  ('mental-health', 'Mental health', 'approved'),
  ('addiction', 'Addiction & recovery', 'approved'),
  ('grief', 'Grief & loss', 'approved'),
  ('marriage', 'Marriage', 'approved'),
  ('family', 'Family & children', 'approved'),
  ('prodigals', 'Prodigals', 'approved'),
  ('salvation', 'Salvation of loved ones', 'approved'),
  ('finances', 'Jobs & finances', 'approved'),
  ('military', 'Military & veterans', 'approved'),
  ('first-responders', 'First responders', 'approved'),
  ('pastors', 'Pastors & ministry', 'approved'),
  ('missionaries', 'Missionaries', 'approved'),
  ('persecuted', 'Persecuted church', 'approved'),
  ('pregnancy', 'Pregnancy & infertility', 'approved'),
  ('students', 'Students & exams', 'approved'),
  ('travel', 'Travel safety', 'approved'),
  ('prison', 'Prison & incarceration', 'approved'),
  ('disaster', 'Disaster relief', 'approved'),
  ('loneliness', 'Loneliness', 'approved'),
  ('nations', 'Nations & leaders', 'approved'),
  ('spiritual-growth', 'Spiritual growth', 'approved'),
  ('elderly', 'Aging & elderly care', 'approved');

-- ---------------------------------------------------------------- requests
create table public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(body) between 10 and 600),
  display_name text not null default 'Anonymous' check (char_length(display_name) <= 30),
  place text check (char_length(place) <= 40),
  is_urgent boolean not null default false,
  categories text[] not null default '{}' check (cardinality(categories) <= 3),
  status text not null default 'published' check (status in ('published', 'held', 'removed')),
  flags text[] not null default '{}',
  prayer_count integer not null default 0,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
create index prayer_requests_feed on public.prayer_requests (created_at desc) where status = 'published';
alter table public.prayer_requests enable row level security;
create policy "public reads published requests" on public.prayer_requests for select
  using (status = 'published' or public.is_admin());

-- Who wrote what. Never readable by clients; only security-definer functions touch it.
create table public.request_authors (
  request_id uuid primary key references public.prayer_requests (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade
);
create index request_authors_author on public.request_authors (author_id);
alter table public.request_authors enable row level security;

-- ---------------------------------------------------------------- prayers
create table public.prayers (
  request_id uuid not null references public.prayer_requests (id) on delete cascade,
  warrior_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, warrior_id)
);
create index prayers_warrior on public.prayers (warrior_id, created_at desc);
alter table public.prayers enable row level security;
create policy "warriors read own prayers" on public.prayers for select using (warrior_id = auth.uid());

-- ---------------------------------------------------------------- updates (close the loop)
create table public.request_updates (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.prayer_requests (id) on delete cascade,
  kind text not null check (kind in ('update', 'praise')),
  body text not null check (char_length(body) between 3 and 400),
  status text not null default 'published' check (status in ('published', 'held', 'removed')),
  created_at timestamptz not null default now()
);
create index request_updates_request on public.request_updates (request_id, created_at);
alter table public.request_updates enable row level security;
create policy "public reads published updates" on public.request_updates for select
  using ((status = 'published' and exists (select 1 from public.prayer_requests r where r.id = request_id and r.status = 'published'))
         or public.is_admin());

-- ---------------------------------------------------------------- reports
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.prayer_requests (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('scam', 'personal-info', 'hateful', 'not-a-prayer', 'crisis', 'other')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (request_id, reporter_id)
);
alter table public.reports enable row level security;
create policy "admins read reports" on public.reports for select using (public.is_admin());

-- ---------------------------------------------------------------- moderation screen
-- Mirrors src/lib/moderation.ts. Keep the two in step; tests cover both.
create function public.screen_text(t text) returns text[] language plpgsql immutable as $$
declare
  f text[] := '{}';
  l text := lower(t);
begin
  if t ~ '\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}' then f := array_append(f, 'contact-info'); end if;
  if t ~* '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' then f := array_append(f, 'contact-info'); end if;
  if l ~ '(https?://|www\.|\m[a-z0-9-]+\.(com|net|org|io|ly|me|co)\M)' then f := array_append(f, 'link'); end if;
  if l ~ '(cash ?app|venmo|paypal|zelle|gofundme|go fund me|bitcoin|crypto|western union|moneygram|gift ?cards?|wire (me|the)|send (me )?money|\$[a-z][a-z0-9_]{2,}|donat(e|ions?)|bank account|routing number)' then
    f := array_append(f, 'money');
  end if;
  if l ~ '(suicid|kill myself|end my life|want to die|don''t want to live|dont want to live|self[- ]harm|cutting myself|overdose)' then
    f := array_append(f, 'crisis-self');
  end if;
  if l ~ '(he hits me|she hits me|beats me|being abused|abusing me|molest|threatened to kill|afraid for my life)' then
    f := array_append(f, 'crisis-abuse');
  end if;
  return array(select distinct unnest(f) order by 1);
end $$;

-- Flags that keep a request off the feed until an admin approves it.
create function public.holding_flags(f text[]) returns boolean language sql immutable as $$
  select f && array['contact-info', 'link', 'money']
$$;

-- ---------------------------------------------------------------- functions the app calls
create function public.submit_request(
  p_body text, p_categories text[], p_display_name text, p_place text, p_is_anonymous boolean, p_is_urgent boolean
) returns table (id uuid, status text, flags text[])
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  f text[];
  st text;
  new_id uuid;
  recent int;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  if not exists (select 1 from profiles where profiles.id = uid and is_requester) then
    raise exception 'Turn on "I need prayer" in your settings to share a request.';
  end if;
  select count(*) into recent from request_authors a join prayer_requests r on r.id = a.request_id
    where a.author_id = uid and r.created_at > now() - interval '24 hours';
  if recent >= 5 then raise exception 'You can share up to 5 requests a day. Please try again tomorrow.'; end if;

  f := screen_text(coalesce(p_body, '') || ' ' || coalesce(p_place, '') || ' ' || coalesce(p_display_name, ''));
  st := case when holding_flags(f) then 'held' else 'published' end;

  insert into prayer_requests (body, display_name, place, is_urgent, categories, status, flags)
  values (
    btrim(p_body),
    case when p_is_anonymous or nullif(btrim(p_display_name), '') is null then 'Anonymous' else left(btrim(p_display_name), 30) end,
    nullif(left(btrim(coalesce(p_place, '')), 40), ''),
    coalesce(p_is_urgent, false),
    coalesce((select array_agg(c) from unnest(p_categories) c where c in (select label from interests where interests.status = 'approved')), '{}'),
    st, f
  ) returning prayer_requests.id into new_id;
  insert into request_authors (request_id, author_id) values (new_id, uid);
  return query select new_id, st, f;
end $$;

create function public.my_requests()
returns setof public.prayer_requests language sql stable security definer set search_path = public as $$
  select r.* from prayer_requests r join request_authors a on a.request_id = r.id
  where a.author_id = auth.uid() and r.status <> 'removed' order by r.created_at desc
$$;

create function public.is_my_request(p_request uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from request_authors where request_id = p_request and author_id = auth.uid())
$$;

create function public.pray_for(p_request uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n int;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  if not exists (select 1 from prayer_requests where id = p_request and status = 'published') then
    raise exception 'That request is no longer available.';
  end if;
  if exists (select 1 from request_authors where request_id = p_request and author_id = uid) then
    raise exception 'This is your own request.';
  end if;
  insert into prayers (request_id, warrior_id) values (p_request, uid) on conflict do nothing;
  update prayer_requests set prayer_count = (select count(*) from prayers where request_id = p_request)
    where id = p_request returning prayer_count into n;
  return n;
end $$;

create function public.post_update(p_request uuid, p_kind text, p_body text) returns text
language plpgsql security definer set search_path = public as $$
declare f text[]; st text;
begin
  if not public.is_my_request(p_request) then raise exception 'Only the person who asked can post an update.'; end if;
  f := screen_text(p_body);
  st := case when holding_flags(f) then 'held' else 'published' end;
  insert into request_updates (request_id, kind, body, status) values (p_request, p_kind, btrim(p_body), st);
  if p_kind = 'praise' then update prayer_requests set answered_at = coalesce(answered_at, now()) where id = p_request; end if;
  return st;
end $$;

create function public.remove_my_request(p_request uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_my_request(p_request) or public.is_admin()) then raise exception 'Not allowed.'; end if;
  update prayer_requests set status = 'removed' where id = p_request;
end $$;

-- Three reports from different people hide a request until an admin looks.
create function public.report_request(p_request uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n int;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  insert into reports (request_id, reporter_id, reason) values (p_request, uid, p_reason) on conflict do nothing;
  select count(*) into n from reports where request_id = p_request and resolved_at is null;
  if n >= 3 then update prayer_requests set status = 'held' where id = p_request and status = 'published'; end if;
end $$;

create function public.suggest_interest(p_label text) returns text
language plpgsql security definer set search_path = public as $$
declare s text := trim(both '-' from regexp_replace(lower(btrim(p_label)), '[^a-z0-9]+', '-', 'g'));
begin
  if auth.uid() is null then raise exception 'Please sign in first.'; end if;
  if char_length(btrim(p_label)) < 3 then raise exception 'Use at least three letters.'; end if;
  if cardinality(screen_text(p_label)) > 0 then raise exception 'That interest can''t be added.'; end if;
  insert into interests (slug, label, suggested_by) values (left(s, 48), left(btrim(p_label), 32), auth.uid())
    on conflict do nothing;
  return 'pending';
end $$;

-- Updates from requests this warrior prayed for (the "close the loop" inbox).
create function public.updates_for_me(p_limit int default 30)
returns table (request_id uuid, display_name text, request_body text, kind text, body text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select u.request_id, r.display_name, r.body, u.kind, u.body, u.created_at
  from request_updates u
  join prayers p on p.request_id = u.request_id and p.warrior_id = auth.uid()
  join prayer_requests r on r.id = u.request_id and r.status = 'published'
  where u.status = 'published'
  order by u.created_at desc limit least(p_limit, 100)
$$;

-- ---------------------------------------------------------------- admin
create function public.moderate_request(p_request uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if p_status not in ('published', 'removed') then raise exception 'Bad status.'; end if;
  update prayer_requests set status = p_status where id = p_request;
  update reports set resolved_at = now() where request_id = p_request and resolved_at is null;
end $$;

create function public.moderate_update(p_update uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if p_status not in ('published', 'removed') then raise exception 'Bad status.'; end if;
  update request_updates set status = p_status where id = p_update;
end $$;

create function public.moderate_interest(p_slug text, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if p_status not in ('approved', 'rejected') then raise exception 'Bad status.'; end if;
  update interests set status = p_status where slug = p_slug;
end $$;

-- ---------------------------------------------------------------- grants
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon;
grant select on public.prayer_requests, public.interests, public.request_updates to anon, authenticated;
grant update (first_name, is_warrior, is_requester, onboarded, interests, lived_experience, three_mix, show_guides)
  on public.profiles to authenticated;
grant select on public.profiles to authenticated;
grant select on public.prayers, public.reports to authenticated;
grant execute on function public.is_admin(), public.screen_text(text), public.holding_flags(text[]) to anon, authenticated;
grant execute on function
  public.submit_request(text, text[], text, text, boolean, boolean), public.my_requests(), public.is_my_request(uuid),
  public.pray_for(uuid), public.post_update(uuid, text, text), public.remove_my_request(uuid),
  public.report_request(uuid, text), public.suggest_interest(text), public.updates_for_me(int),
  public.moderate_request(uuid, text), public.moderate_update(uuid, text), public.moderate_interest(text, text)
  to authenticated;

-- Live feed: stream new and changed requests to browsers (RLS still applies).
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.prayer_requests;
  end if;
end $$;
