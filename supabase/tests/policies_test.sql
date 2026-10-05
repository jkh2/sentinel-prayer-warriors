-- Run with scripts/test-db.sh. Any failed assertion raises and stops the script.
\set ON_ERROR_STOP on
insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', '{"full_name":"Maria Lopez"}'),
  ('00000000-0000-0000-0000-00000000000b', '{"full_name":"Tom Reed"}'),
  ('00000000-0000-0000-0000-00000000000c', '{}'),
  ('00000000-0000-0000-0000-00000000000d', '{}');
update profiles set is_requester = true where id = '00000000-0000-0000-0000-00000000000a';
update profiles set is_warrior = true where id <> '00000000-0000-0000-0000-00000000000a';
update profiles set is_admin = true where id = '00000000-0000-0000-0000-00000000000d';

do $$ begin assert (select first_name from profiles where id = '00000000-0000-0000-0000-00000000000a') = 'Maria', 'first name from provider'; end $$;

create temp table t (k text primary key, v text);
grant all on t to authenticated, anon;

-- Maria (requester) shares requests
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
insert into t select 'clean', id::text from submit_request('We are short on groceries until payday. Pray for provision.', array['Food & hunger','Not a real interest'], 'Maria', 'Ohio', false, false);
insert into t select k, v from submit_request('Please send money to my cashapp $mariahelp, we need it', '{}', 'Maria', null, false, false) r,
  lateral (values ('money', r.id::text), ('money_s', r.status)) x(k, v);
insert into t select k, v from submit_request('I want to end my life, please pray for me tonight', '{}', null, null, true, true) r,
  lateral (values ('crisis', r.id::text), ('crisis_s', array_to_string(r.flags, ',') || '|' || r.status)) x(k, v);
do $$ begin
  assert (select v from t where k = 'money_s') = 'held', 'money request held';
  assert (select v from t where k = 'crisis_s') = 'crisis-self|published', 'crisis published but flagged';
  assert (select categories from prayer_requests where id = (select v from t where k='clean')::uuid) = array['Food & hunger'], 'unknown categories dropped';
  assert (select count(*) from my_requests()) = 3, 'author sees own requests incl held';
end $$;
-- cannot pray for own request; cannot make self admin
do $$ begin
  begin perform pray_for((select v from t where k='clean')::uuid); assert false, 'self prayer should fail';
  exception when raise_exception then null; end;
  begin update profiles set is_admin = true where id = auth.uid(); assert false, 'self admin should fail';
  exception when insufficient_privilege then null; end;
end $$;

-- Tom (warrior) reads feed, prays twice (counts once)
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from prayer_requests) = 2, 'held request hidden from public';
  assert pray_for((select v from t where k='clean')::uuid) = 1;
  assert pray_for((select v from t where k='clean')::uuid) = 1, 'second prayer does not double count';
  begin perform * from request_authors; assert false, 'authors must be unreadable';
  exception when insufficient_privilege then null; end;
  begin perform submit_request('Tom is not a requester yet so this fails', '{}', 'Tom', null, false, false); assert false, 'non-requester submit should fail';
  exception when raise_exception then null; end;
end $$;

-- Maria posts a praise report; Tom sees it in his inbox
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin assert post_update((select v from t where k='clean')::uuid, 'praise', 'A neighbor brought us groceries today. Thank you all!') = 'published'; end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from updates_for_me()) = 1, 'warrior sees praise report';
  begin perform post_update((select v from t where k='clean')::uuid, 'update', 'not mine'); assert false, 'only author posts updates';
  exception when raise_exception then null; end;
end $$;

-- three reports hide a request
select report_request((select v from t where k='crisis')::uuid, 'other');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select report_request((select v from t where k='crisis')::uuid, 'other');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
select report_request((select v from t where k='crisis')::uuid, 'other');
do $$ begin
  assert (select status from prayer_requests where id = (select v from t where k='crisis')::uuid) = 'held', 'reports hold request';
  perform moderate_request((select v from t where k='money')::uuid, 'removed');
  assert (select count(*) from reports where resolved_at is null) = 3;
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  begin perform moderate_request((select v from t where k='money')::uuid, 'published'); assert false, 'non-admin moderation fails';
  exception when raise_exception then null; end;
  assert suggest_interest('Foster families') = 'pending';
  assert not exists (select 1 from interests where label = 'Foster families'), 'pending interest hidden';
end $$;

-- anonymous visitors can read the feed but not write
reset request.jwt.claim.sub;
set role anon;
do $$ begin
  assert (select count(*) from prayer_requests) = 1, 'anon reads published feed';
  begin perform pray_for((select id from prayer_requests limit 1)); assert false, 'anon cannot pray';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'ALL DATABASE TESTS PASSED' as result;
