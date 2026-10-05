-- Round two: church circles, The Watch (prayer hours), Adopt a Person, in-app notifications,
-- and account deletion. Same rules as the first migration: clients read through RLS, and every
-- write that matters goes through a security-definer function.

-- ---------------------------------------------------------------- helpers
create function public.valid_timezone(tz text) returns boolean language sql stable set search_path = public as $$
  select exists (select 1 from pg_timezone_names where name = tz)
$$;

-- ---------------------------------------------------------------- notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('prayed', 'adopted', 'update', 'praise', 'approved', 'removed', 'circle-request')),
  request_id uuid references public.prayer_requests (id) on delete cascade,
  body text not null check (char_length(body) <= 300),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_user on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
create policy "read own notifications" on public.notifications for select using (user_id = auth.uid());

create function public.notify(p_user uuid, p_kind text, p_request uuid, p_body text) returns void
language sql security definer set search_path = public as $$
  insert into notifications (user_id, kind, request_id, body)
  select p_user, p_kind, p_request, left(p_body, 300) where p_user is not null
$$;

create function public.request_author(p_request uuid) returns uuid language sql stable security definer set search_path = public as $$
  select author_id from request_authors where request_id = p_request
$$;

create function public.mark_notifications_read() returns void
language sql security definer set search_path = public as $$
  update notifications set read_at = now() where user_id = auth.uid() and read_at is null
$$;

create function public.unread_notifications() returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from notifications where user_id = auth.uid() and read_at is null
$$;

-- ---------------------------------------------------------------- circles
create table public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 60),
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.circles enable row level security;

create table public.circle_members (
  circle_id uuid not null references public.circles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('leader', 'member')),
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);
create index circle_members_user on public.circle_members (user_id);
alter table public.circle_members enable row level security;

create function public.is_circle_member(p_circle uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from circle_members where circle_id = p_circle and user_id = auth.uid())
$$;
create function public.is_circle_leader(p_circle uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from circle_members where circle_id = p_circle and user_id = auth.uid() and role = 'leader')
$$;

create policy "members read their circles" on public.circles for select using (public.is_circle_member(id));

alter table public.prayer_requests add column circle_id uuid references public.circles (id) on delete cascade;
create index prayer_requests_circle on public.prayer_requests (circle_id, created_at desc) where status = 'published';

-- Circle requests are visible only to that circle's members (and reviewers).
drop policy "public reads published requests" on public.prayer_requests;
create policy "public reads published requests" on public.prayer_requests for select
  using ((status = 'published' and (circle_id is null or public.is_circle_member(circle_id))) or public.is_admin());

-- Can the current viewer see this request at all?
create function public.can_see_request(p_request uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from prayer_requests r where r.id = p_request and r.status = 'published'
    and (r.circle_id is null or public.is_circle_member(r.circle_id)))
$$;

create function public.my_circles()
returns table (id uuid, name text, role text, invite_code text, member_count integer, request_count integer)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, m.role, c.invite_code,
    (select count(*)::int from circle_members x where x.circle_id = c.id),
    (select count(*)::int from prayer_requests r where r.circle_id = c.id and r.status = 'published' and r.expires_at > now())
  from circles c join circle_members m on m.circle_id = c.id and m.user_id = auth.uid()
  order by c.name
$$;

-- What someone holding an invite link sees before joining: the name and size, nothing else.
create function public.circle_preview(p_code text) returns table (id uuid, name text, member_count integer, is_member boolean)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, (select count(*)::int from circle_members x where x.circle_id = c.id), public.is_circle_member(c.id)
  from circles c where c.invite_code = lower(btrim(p_code))
$$;

create function public.create_circle(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); new_id uuid;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  if char_length(btrim(coalesce(p_name, ''))) < 3 then raise exception 'Please give your circle a name of at least three letters.'; end if;
  if cardinality(screen_text(p_name)) > 0 then raise exception 'Please choose a name without links, contact details or money words.'; end if;
  if (select count(*) from circles where created_by = uid) >= 10 then raise exception 'You can start up to 10 circles.'; end if;
  insert into circles (name, created_by) values (left(btrim(p_name), 60), uid) returning id into new_id;
  insert into circle_members (circle_id, user_id, role) values (new_id, uid, 'leader');
  return new_id;
end $$;

create function public.join_circle(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c uuid;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  select id into c from circles where invite_code = lower(btrim(p_code));
  if c is null then raise exception 'That invitation link is not valid. Ask your circle leader for a new one.'; end if;
  insert into circle_members (circle_id, user_id) values (c, uid) on conflict do nothing;
  return c;
end $$;

-- Leaving keeps a circle alive: if the last leader leaves, the longest-standing member leads.
create function public.leave_circle(p_circle uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from circle_members where circle_id = p_circle and user_id = auth.uid();
  if not exists (select 1 from circle_members where circle_id = p_circle and role = 'leader') then
    update circle_members set role = 'leader'
      where (circle_id, user_id) = (select circle_id, user_id from circle_members where circle_id = p_circle order by joined_at limit 1);
  end if;
  if not exists (select 1 from circle_members where circle_id = p_circle) then
    delete from circles where id = p_circle;
  end if;
end $$;

create function public.circle_members_list(p_circle uuid)
returns table (user_id uuid, first_name text, role text, joined_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_circle_leader(p_circle) then raise exception 'Only circle leaders can see the member list.'; end if;
  return query select m.user_id, coalesce(p.first_name, 'Member'), m.role, m.joined_at
    from circle_members m left join profiles p on p.id = m.user_id
    where m.circle_id = p_circle order by m.role, m.joined_at;
end $$;

create function public.remove_circle_member(p_circle uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_circle_leader(p_circle) then raise exception 'Only circle leaders can remove members.'; end if;
  if p_user = auth.uid() then raise exception 'Use “Leave this circle” to leave it yourself.'; end if;
  delete from circle_members where circle_id = p_circle and user_id = p_user;
end $$;

create function public.reset_circle_invite(p_circle uuid) returns text
language plpgsql security definer set search_path = public as $$
declare code text;
begin
  if not public.is_circle_leader(p_circle) then raise exception 'Only circle leaders can make a new invitation link.'; end if;
  update circles set invite_code = encode(gen_random_bytes(6), 'hex') where id = p_circle returning invite_code into code;
  return code;
end $$;

-- Leaders can take a request off their circle's wall.
create function public.remove_circle_request(p_request uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c uuid;
begin
  select circle_id into c from prayer_requests where id = p_request;
  if c is null or not public.is_circle_leader(c) then raise exception 'Only circle leaders can remove requests from their circle.'; end if;
  update prayer_requests set status = 'removed' where id = p_request;
end $$;

-- Tell circle members when a request appears on their wall.
create function public.notify_circle_request() returns trigger
language plpgsql security definer set search_path = public as $$
declare author uuid := public.request_author(new.id); cname text;
begin
  if new.circle_id is null or new.status <> 'published' then return new; end if;
  if tg_op = 'UPDATE' and old.status <> 'held' then return new; end if;
  select name into cname from circles where id = new.circle_id;
  insert into notifications (user_id, kind, request_id, body)
    select m.user_id, 'circle-request', new.id, left('New prayer request in ' || cname || ' from ' || new.display_name || ': ' || new.body, 300)
    from circle_members m where m.circle_id = new.circle_id and m.user_id is distinct from author;
  return new;
end $$;
-- Covers held requests a reviewer approves. New requests are announced in submit_request,
-- because the author row is written after the request itself.
create trigger prayer_requests_circle_notify after update of status on public.prayer_requests
  for each row execute function public.notify_circle_request();

-- ---------------------------------------------------------------- submit_request, now with circles
drop function public.submit_request(text, text[], text, text, boolean, boolean);
create function public.submit_request(
  p_body text, p_categories text[], p_display_name text, p_place text, p_is_anonymous boolean, p_is_urgent boolean,
  p_circle uuid default null
) returns table (id uuid, status text, flags text[])
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  f text[];
  st text;
  new_id uuid;
  recent int;
  cname text;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  if not exists (select 1 from profiles where profiles.id = uid and is_requester) then
    raise exception 'Turn on "I need prayer" in your settings to share a request.';
  end if;
  if p_circle is not null and not public.is_circle_member(p_circle) then
    raise exception 'You can only share with circles you belong to.';
  end if;
  select count(*) into recent from request_authors a join prayer_requests r on r.id = a.request_id
    where a.author_id = uid and r.created_at > now() - interval '24 hours';
  if recent >= 5 then raise exception 'You can share up to 5 requests a day. Please try again tomorrow.'; end if;

  f := screen_text(coalesce(p_body, '') || ' ' || coalesce(p_place, '') || ' ' || coalesce(p_display_name, ''));
  st := case when holding_flags(f) then 'held' else 'published' end;

  insert into prayer_requests (body, display_name, place, is_urgent, categories, status, flags, circle_id)
  values (
    btrim(p_body),
    case when p_is_anonymous or nullif(btrim(p_display_name), '') is null then 'Anonymous' else left(btrim(p_display_name), 30) end,
    nullif(left(btrim(coalesce(p_place, '')), 40), ''),
    coalesce(p_is_urgent, false),
    coalesce((select array_agg(c) from unnest(p_categories) c where c in (select label from interests where interests.status = 'approved')), '{}'),
    st, f, p_circle
  ) returning prayer_requests.id into new_id;
  insert into request_authors (request_id, author_id) values (new_id, uid);

  if p_circle is not null and st = 'published' then
    select name into cname from circles where circles.id = p_circle;
    insert into notifications (user_id, kind, request_id, body)
      select m.user_id, 'circle-request', new_id,
        left('New prayer request in ' || cname || ' from ' || r.display_name || ': ' || r.body, 300)
      from circle_members m, prayer_requests r
      where m.circle_id = p_circle and m.user_id <> uid and r.id = new_id;
  end if;
  return query select new_id, st, f;
end $$;

-- ---------------------------------------------------------------- Adopt a Person
create table public.adoptions (
  request_id uuid not null references public.prayer_requests (id) on delete cascade,
  warrior_id uuid not null references auth.users (id) on delete cascade,
  timezone text not null,
  started_on date not null,
  days_prayed date[] not null default '{}',
  created_at timestamptz not null default now(),
  primary key (request_id, warrior_id)
);
create index adoptions_warrior on public.adoptions (warrior_id, started_on desc);
alter table public.adoptions enable row level security;
create policy "warriors read own adoptions" on public.adoptions for select using (warrior_id = auth.uid());

alter table public.prayer_requests add column adopted_count integer not null default 0;

-- An adoption lasts seven days in the warrior's own time zone, starting the day they adopt.
create function public.adoption_today(a public.adoptions) returns date language sql stable set search_path = public as $$
  select (now() at time zone a.timezone)::date
$$;

-- pray_for now also: checks the viewer can see the request (circles), tells the requester at
-- milestones, and marks today's prayer for anyone who adopted this request.
create or replace function public.pray_for(p_request uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n int; inserted int;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  if not public.can_see_request(p_request) then
    raise exception 'That request is no longer available.';
  end if;
  if exists (select 1 from request_authors where request_id = p_request and author_id = uid) then
    raise exception 'This is your own request.';
  end if;
  insert into prayers (request_id, warrior_id) values (p_request, uid) on conflict do nothing;
  get diagnostics inserted = row_count;
  update prayer_requests set prayer_count = (select count(*) from prayers where request_id = p_request)
    where id = p_request returning prayer_count into n;
  if inserted > 0 and n in (1, 3, 5, 10, 25, 50, 100, 250, 500, 1000) then
    perform public.notify(public.request_author(p_request), 'prayed', p_request,
      case when n = 1 then 'Someone just prayed for your request.' else n || ' people have now prayed for your request.' end);
  end if;
  update adoptions a set days_prayed = array_append(a.days_prayed, public.adoption_today(a))
    where a.request_id = p_request and a.warrior_id = uid
      and public.adoption_today(a) between a.started_on and a.started_on + 6
      and not (public.adoption_today(a) = any (a.days_prayed));
  return n;
end $$;

create function public.adopt_request(p_request uuid, p_timezone text) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); today date; existing adoptions; had_one boolean;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  if not public.valid_timezone(p_timezone) then raise exception 'Unknown time zone.'; end if;
  if not public.can_see_request(p_request) then raise exception 'That request is no longer available.'; end if;
  if exists (select 1 from request_authors where request_id = p_request and author_id = uid) then
    raise exception 'This is your own request.';
  end if;
  today := (now() at time zone p_timezone)::date;
  select * into existing from adoptions where request_id = p_request and warrior_id = uid;
  had_one := found;
  if had_one and today <= existing.started_on + 6 then return; end if; -- already carrying them this week
  if (select count(*) from adoptions a where a.warrior_id = uid and public.adoption_today(a) <= a.started_on + 6) >= 7 then
    raise exception 'You are already carrying 7 people this week. Finish one before adopting another.';
  end if;
  insert into adoptions (request_id, warrior_id, timezone, started_on) values (p_request, uid, p_timezone, today)
    on conflict (request_id, warrior_id) do update set timezone = excluded.timezone, started_on = excluded.started_on, days_prayed = '{}';
  if not had_one then
    update prayer_requests set adopted_count = adopted_count + 1 where id = p_request;
  end if;
  perform public.notify(public.request_author(p_request), 'adopted', p_request,
    'Someone has promised to pray for you every day this week.');
  perform public.pray_for(p_request);
end $$;

create function public.end_adoption(p_request uuid) returns void
language sql security definer set search_path = public as $$
  delete from adoptions where request_id = p_request and warrior_id = auth.uid()
$$;

-- ---------------------------------------------------------------- The Watch
-- Warriors keep a weekly hour in their own time zone (0 = Sunday, like JavaScript).
create table public.watch_hours (
  warrior_id uuid not null references auth.users (id) on delete cascade,
  dow smallint not null check (dow between 0 and 6),
  hour smallint not null check (hour between 0 and 23),
  timezone text not null,
  created_at timestamptz not null default now(),
  primary key (warrior_id, dow, hour)
);
alter table public.watch_hours enable row level security;
create policy "warriors read own watch hours" on public.watch_hours for select using (warrior_id = auth.uid());

create function public.add_watch_hour(p_dow int, p_hour int, p_timezone text) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  if not exists (select 1 from profiles where id = uid and is_warrior) then
    raise exception 'Turn on "I want to pray for others" in Settings to keep watch.';
  end if;
  if not public.valid_timezone(p_timezone) then raise exception 'Unknown time zone.'; end if;
  if (select count(*) from watch_hours where warrior_id = uid) >= 21 then
    raise exception 'You can keep up to 21 hours a week. Thank you for your faithfulness!';
  end if;
  insert into watch_hours (warrior_id, dow, hour, timezone) values (uid, p_dow, p_hour, p_timezone)
    on conflict (warrior_id, dow, hour) do update set timezone = excluded.timezone;
end $$;

create function public.remove_watch_hour(p_dow int, p_hour int) returns void
language sql security definer set search_path = public as $$
  delete from watch_hours where warrior_id = auth.uid() and dow = p_dow and hour = p_hour
$$;

-- How many warriors keep each hour of this week, by UTC hour of the week (0 = Monday 00:00 UTC).
-- Counts only, never who.
create function public.watch_coverage() returns table (utc_hour integer, warriors integer)
language sql stable security definer set search_path = public as $$
  select ((extract(isodow from t)::int - 1) * 24 + extract(hour from t)::int) as utc_hour, count(*)::int
  from (
    select ((date_trunc('week', now() at time zone w.timezone) + ((w.dow + 6) % 7) * interval '1 day' + w.hour * interval '1 hour')
      at time zone w.timezone) at time zone 'UTC' as t
    from watch_hours w
  ) s group by 1 order by 1
$$;

-- ---------------------------------------------------------------- updates and moderation now notify
create function public.notify_request_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare who text;
begin
  if new.status <> 'published' or (tg_op = 'UPDATE' and old.status = 'published') then return new; end if;
  select display_name into who from prayer_requests where id = new.request_id;
  insert into notifications (user_id, kind, request_id, body)
    select p.warrior_id, new.kind, new.request_id,
      left(case when new.kind = 'praise' then 'Praise report from ' else 'Update from ' end || coalesce(who, 'Anonymous') || ': ' || new.body, 300)
    from prayers p where p.request_id = new.request_id;
  return new;
end $$;
create trigger request_updates_notify after insert or update of status on public.request_updates
  for each row execute function public.notify_request_update();

create or replace function public.moderate_request(p_request uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare before text;
begin
  if not public.is_admin() then raise exception 'Admins only.'; end if;
  if p_status not in ('published', 'removed') then raise exception 'Bad status.'; end if;
  select status into before from prayer_requests where id = p_request;
  update prayer_requests set status = p_status where id = p_request;
  update reports set resolved_at = now() where request_id = p_request and resolved_at is null;
  if before is distinct from p_status then
    perform public.notify(public.request_author(p_request), case when p_status = 'published' then 'approved' else 'removed' end, p_request,
      case when p_status = 'published' then 'Your request was reviewed and is now on the prayer feed.'
           else 'A reviewer took your request down because it did not fit our guidelines. You are welcome to share it again without contact details, links or money requests.' end);
  end if;
end $$;

-- Reporting now respects circles too.
create or replace function public.report_request(p_request uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n int;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  if not public.can_see_request(p_request) then raise exception 'That request is no longer available.'; end if;
  insert into reports (request_id, reporter_id, reason) values (p_request, uid, p_reason) on conflict do nothing;
  select count(*) into n from reports where request_id = p_request and resolved_at is null;
  if n >= 3 then update prayer_requests set status = 'held' where id = p_request and status = 'published'; end if;
end $$;

-- ---------------------------------------------------------------- delete my account
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c uuid;
begin
  if uid is null then raise exception 'Please sign in first.'; end if;
  update prayer_requests set status = 'removed' where id in (select request_id from request_authors where author_id = uid);
  for c in select circle_id from circle_members where user_id = uid loop
    perform public.leave_circle(c);
  end loop;
  delete from auth.users where id = uid;
end $$;

-- ---------------------------------------------------------------- grants
-- Supabase grants new tables and functions to the API roles by default; take that back and
-- grant only what the app uses.
revoke all on public.notifications, public.circles, public.circle_members, public.adoptions, public.watch_hours from anon, authenticated;
grant select on public.notifications, public.circles, public.adoptions, public.watch_hours to authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.is_admin(), public.screen_text(text), public.holding_flags(text[]),
  public.is_circle_member(uuid), public.can_see_request(uuid), public.watch_coverage(), public.circle_preview(text)
  to anon, authenticated;
grant execute on function
  public.submit_request(text, text[], text, text, boolean, boolean, uuid), public.my_requests(), public.is_my_request(uuid),
  public.pray_for(uuid), public.post_update(uuid, text, text), public.remove_my_request(uuid),
  public.report_request(uuid, text), public.suggest_interest(text), public.updates_for_me(int),
  public.moderate_request(uuid, text), public.moderate_update(uuid, text), public.moderate_interest(text, text),
  public.is_circle_leader(uuid), public.my_circles(), public.create_circle(text), public.join_circle(text),
  public.leave_circle(uuid), public.circle_members_list(uuid), public.remove_circle_member(uuid, uuid),
  public.reset_circle_invite(uuid), public.remove_circle_request(uuid),
  public.adopt_request(uuid, text), public.end_adoption(uuid),
  public.add_watch_hour(int, int, text), public.remove_watch_hour(int, int),
  public.mark_notifications_read(), public.unread_notifications(), public.delete_my_account()
  to authenticated;
