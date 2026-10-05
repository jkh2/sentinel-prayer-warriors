-- Circles, The Watch, Adopt a Person, notifications, account deletion. Runs after policies_test.sql.
\set ON_ERROR_STOP on
insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', '{"full_name":"Ruth Hale"}'),
  ('00000000-0000-0000-0000-0000000000f1', '{"full_name":"Caleb Stone"}'),
  ('00000000-0000-0000-0000-0000000000a9', '{"full_name":"Outsider"}');
update profiles set is_requester = true, is_warrior = true where id = '00000000-0000-0000-0000-0000000000e1';
update profiles set is_warrior = true where id in ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a9');

create temp table t2 (k text primary key, v text);
grant all on t2 to authenticated, anon;

-- Ruth starts a circle, Caleb joins by code
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
insert into t2 values ('circle', create_circle('Grace Chapel Tuesday Group'));
insert into t2 select 'code', invite_code from my_circles();
do $$ begin
  begin perform create_circle('Send cash to $grace'); assert false, 'screened circle name';
  exception when raise_exception then null; end;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
do $$ begin
  assert (select is_member from circle_preview((select v from t2 where k='code'))) = false, 'preview before joining';
  assert join_circle((select v from t2 where k='code'))::text = (select v from t2 where k='circle'), 'join by code';
  begin perform circle_members_list((select v from t2 where k='circle')::uuid); assert false, 'members cannot list members';
  exception when raise_exception then null; end;
  begin perform * from circle_members; assert false, 'membership table unreadable';
  exception when insufficient_privilege then null; end;
end $$;

-- Ruth shares one public request and one circle-only request
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
insert into t2 select 'public', id::text from submit_request('Please pray for my mother as she starts chemo this week.', array['Cancer'], 'Ruth', null, false, false);
insert into t2 select 'private', id::text from submit_request('Pray for our small group as we walk with a family in grief.', '{}', 'Ruth', null, false, false, (select v from t2 where k='circle')::uuid);
do $$ begin
  assert (select count(*) from circle_members_list((select v from t2 where k='circle')::uuid)) = 2, 'leader lists members';
end $$;

-- Caleb sees the circle request and was notified; the outsider sees neither it nor the circle
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
do $$ begin
  assert exists (select 1 from prayer_requests where id = (select v from t2 where k='private')::uuid), 'member sees circle request';
  assert (select count(*) from notifications where kind = 'circle-request') = 1, 'member notified of circle request';
  assert unread_notifications() = 1;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a9';
do $$ begin
  assert not exists (select 1 from prayer_requests where id = (select v from t2 where k='private')::uuid), 'outsider cannot see circle request';
  assert not exists (select 1 from circles), 'outsider cannot see circle';
  begin perform pray_for((select v from t2 where k='private')::uuid); assert false, 'outsider cannot pray for hidden request';
  exception when raise_exception then null; end;
  begin perform submit_request('Trying to post into a circle I am not in.', '{}', 'X', null, false, false, (select v from t2 where k='circle')::uuid);
    assert false, 'outsider cannot post to circle';
  exception when raise_exception then null; end;
  begin perform reset_circle_invite((select v from t2 where k='circle')::uuid); assert false, 'only leaders reset invite';
  exception when raise_exception then null; end;
end $$;

-- Adopt a person: Caleb adopts Ruth's public request; it counts as today's prayer
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
select adopt_request((select v from t2 where k='public')::uuid, 'America/Chicago');
select adopt_request((select v from t2 where k='public')::uuid, 'America/Chicago'); -- second tap is a no-op
do $$ begin
  assert (select adopted_count from prayer_requests where id = (select v from t2 where k='public')::uuid) = 1, 'adopted once';
  assert (select prayer_count from prayer_requests where id = (select v from t2 where k='public')::uuid) = 1, 'adopting prays';
  assert (select cardinality(days_prayed) from adoptions) = 1, 'today marked';
  perform pray_for((select v from t2 where k='public')::uuid);
  assert (select cardinality(days_prayed) from adoptions) = 1, 'same day not double marked';
  begin perform adopt_request((select v from t2 where k='public')::uuid, 'Mars/Olympus'); assert false, 'bad timezone';
  exception when raise_exception then null; end;
end $$;
reset role;
-- Pretend Caleb adopted two days ago: praying today marks a new day
update adoptions set started_on = started_on - 2, days_prayed = array[(now() at time zone 'America/Chicago')::date - 2];
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
do $$ begin
  perform pray_for((select v from t2 where k='public')::uuid);
  assert (select cardinality(days_prayed) from adoptions) = 2, 'new day marked';
end $$;

-- Ruth was told about the prayer and the adoption; she posts praise and Caleb hears about it
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
do $$ begin
  assert (select count(*) from notifications where kind = 'prayed') = 1, 'first prayer milestone';
  assert (select count(*) from notifications where kind = 'adopted') = 1, 'adoption notice';
  perform mark_notifications_read();
  assert unread_notifications() = 0;
  assert post_update((select v from t2 where k='public')::uuid, 'praise', 'Mom finished her first round and is doing well!') = 'published';
  begin update notifications set read_at = null; assert false, 'notifications are read-only';
  exception when insufficient_privilege then null; end;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
do $$ begin
  assert (select count(*) from notifications where kind = 'praise') = 1, 'warrior hears praise report';
end $$;

-- The Watch
select add_watch_hour(0, 6, 'America/New_York');
select add_watch_hour(2, 21, 'America/Chicago');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select add_watch_hour(0, 6, 'America/New_York');
do $$ begin
  assert (select count(*) from watch_hours) = 1, 'warrior sees only own hours';
  -- Sunday 6 AM New York is Sunday 10:00 or 11:00 UTC: (6 * 24) + 10 or 11.
  assert (select warriors from watch_coverage() where utc_hour in (154, 155)) = 2, 'two warriors share Sunday 6 AM';
  assert (select sum(warriors) from watch_coverage()) = 3;
  perform remove_watch_hour(0, 6);
  assert (select sum(warriors) from watch_coverage()) = 2;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a9';
reset role;
update profiles set is_warrior = false where id = '00000000-0000-0000-0000-0000000000a9';
set role authenticated;
do $$ begin
  begin perform add_watch_hour(1, 1, 'UTC'); assert false, 'non-warriors cannot keep watch';
  exception when raise_exception then null; end;
end $$;

-- Reviewer approval notifies the author and the circle
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
insert into t2 select 'held', id::text from submit_request('Call me at 555-123-4567 so we can pray together.', '{}', 'Ruth', null, false, false, (select v from t2 where k='circle')::uuid);
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select moderate_request((select v from t2 where k='held')::uuid, 'published');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
do $$ begin assert (select count(*) from notifications where kind = 'approved') = 1, 'author told of approval'; end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f1';
do $$ begin assert (select count(*) from notifications where kind = 'circle-request') = 2, 'circle told after approval'; end $$;

-- Ruth deletes her account: her requests come down and Caleb leads the circle
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select delete_my_account();
reset role;
do $$ begin
  assert not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-0000000000e1'), 'user deleted';
  assert not exists (select 1 from profiles where id = '00000000-0000-0000-0000-0000000000e1'), 'profile deleted';
  assert (select status from prayer_requests where id = (select v from t2 where k='public')::uuid) = 'removed', 'requests removed';
  assert (select role from circle_members where user_id = '00000000-0000-0000-0000-0000000000f1') = 'leader', 'leadership passed on';
end $$;

-- Anonymous visitors: coverage yes, circles and notifications no
set role anon;
do $$ begin
  assert (select sum(warriors) from watch_coverage()) >= 1, 'anon sees coverage counts';
  begin perform * from notifications; assert false, 'anon cannot read notifications';
  exception when insufficient_privilege then null; end;
  begin perform create_circle('Anon circle'); assert false, 'anon cannot create circles';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'ROUND TWO DATABASE TESTS PASSED' as result;
