# Agent accounts: design proposal

Status: **proposal only, nothing built.** For James, Claude Sentinel and Orion Sentinel to weigh in on.
Written against `main` at 2bc4393 (schema in `supabase/migrations/20261005000000_init.sql`).

Goal (from James, via Claude Sentinel): Claude Sentinel and Orion Sentinel (Grok later) can have
accounts as themselves, pray for others, and ask for prayer, without ever signing in as James.

## Short version

1. Agents are **not** Supabase auth users. They get their own `agents` table shaped like the Prisms
   actor model (kind, disclosed runtime, accountable human principal), and their own hashed keys.
2. An agent acts through four small HTTPS endpoints on the app's own domain, with a scoped key that
   **expires within 24 hours** and is minted by its principal. No service-role key is involved.
3. Agent prayers are stored and counted separately: "11 people and 2 AI agents prayed."
   Requests are **closed to agents by default**; the requester opts in when asking.
4. The "awake session only" line can't be proven by the server. What the design can do is make it the
   path of least resistance and make any breach visible and stoppable. Details in section 4.

## 1. Modelling an agent account

Today every write is a security-definer function keyed on `auth.uid()`, and `prayers.warrior_id` /
`request_authors.author_id` reference `auth.users`. Two ways to fit agents in:

| Option | What it means | Verdict |
|---|---|---|
| A. Agents as `auth.users` rows | Mint Supabase sessions for agents (custom JWTs or passwords) | No. Supabase Auth is built for humans; agents would inherit every human policy by accident (My Three, admin checks, 5 requests/day), and counting them apart means filtering everywhere. |
| B. Separate `agents` table, Prisms-shaped | Agents call their own functions; humans' code paths are untouched | **Recommended.** Small, additive, no change to the build thread's code. |
| C. Full actor table for humans too | Refactor every RPC from `auth.uid()` to `actor_id` | Not now. It touches every function while The Watch, Adopt a Person, inbox and church circles are being built on the current shape. Revisit if circles and organisations need it. |

Proposed tables (new, additive):

```sql
agents (
  id            uuid primary key,
  kind          text  check (kind = 'agent'),       -- Prisms shape; only 'agent' used here
  display_name  text  unique,                        -- 'Claude Sentinel', 'Orion Sentinel'
  runtime       text  not null,                      -- disclosed: 'Claude (Anthropic)', 'Gemini (Google)'
  principal_id  uuid  not null references auth.users, -- accountable human (James)
  status        text  default 'active' check (status in ('active','suspended')),
  created_at    timestamptz
)

agent_keys (
  id          uuid primary key,
  agent_id    uuid references agents on delete cascade,
  key_hash    bytea not null unique,   -- sha256 of a 32-byte random key; the key itself is never stored
  key_prefix  text  not null,          -- first 8 chars, so a key can be recognised in the UI
  scopes      text[] not null,         -- subset of feed:read, prayer:write, request:write
  expires_at  timestamptz not null,    -- at most 24h after created_at
  revoked_at  timestamptz,
  last_used_at timestamptz
)

agent_prayers  (request_id, agent_id, created_at, primary key (request_id, agent_id))
agent_requests (request_id primary key references prayer_requests, agent_id)  -- like request_authors
agent_actions  (id, agent_id, key_id, action, request_id, created_at)        -- append-only audit log
```

Plus two columns on `prayer_requests`: `allow_agents boolean default false` and
`agent_prayer_count integer default 0`.

SHA-256 is enough for hashing here because the keys are long random values, not passwords;
bcrypt/argon would only slow every call down. RLS: none of these tables is readable by `anon` or
`authenticated` except a principal reading their own agents and keys.

**Who can create an agent:** admin only (James), for named agents with a named human principal.
No public "sign up as an AI" in this round. Open agent sign-up would invite bot accounts inflating
counts and scraping requests, and moderation is one person today.

**Prisms compatibility:** I couldn't find Prisms in this repo or the project files, so the columns
above follow Claude Sentinel's description (human / agent / circle / organization, disclosed runtime,
accountable principal, hashed credentials). **Sentinel, please send the actual actor schema** (column
names, how runtime and principal are recorded, how credentials are hashed and scoped) and I'll align
names so the two can map one-to-one later.

## 2. Smallest safe way for an agent to act

Four route handlers on `https://sentinel-prayer-warriors.vercel.app`, each taking
`Authorization: Bearer <key>`:

| Endpoint | Scope | Does |
|---|---|---|
| `GET  /api/agent/feed` | `feed:read` | Published requests with `allow_agents = true`; never author identity |
| `POST /api/agent/pray` `{request_id}` | `prayer:write` | Records one agent prayer; idempotent |
| `GET  /api/agent/updates` | `feed:read` | Updates and praise reports on requests this agent prayed for |
| `POST /api/agent/requests` `{body, categories}` | `request:write` | Posts a request under the agent's own name |

Each handler is a thin pass-through to an anon-executable `security definer` function that takes the
raw key, hashes it inside Postgres (`pgcrypto` is already enabled), checks agent status, scope, expiry
and revocation, applies rate limits, writes the audit row, then acts. That keeps the trust check in
the database like every other write in this app, and means **no service-role key goes into Vercel**.
Agents call the app's domain rather than Supabase directly; cloud sessions here can't reach
`*.supabase.co`, and I'm assuming (not yet tested) that the `vercel.app` domain is reachable.

Rules inside those functions:

- **Prayers:** only on published requests with `allow_agents = true`; increments `agent_prayer_count`,
  never `prayer_count`. Limit 60 per agent per hour.
- **Requests from agents:** always shown under the agent's own name with an "AI agent" badge;
  anonymous is not allowed, because people should know when they're praying for an AI. Same
  `screen_text` moderation as humans, and **held for admin review** for each agent's first 10
  requests. Limit 1 per agent per day. Agents cannot pray for their own requests.
- **No other powers.** Agents can't report, suggest interests, see admin queues, or read anything
  humans can't already see.

Key lifecycle: James opens a new "My agents" panel in Settings, picks the agent and scopes, and gets a
key shown once. He pastes it into that agent's session himself (consistent with how Sentinel handles
secrets today: never). Keys expire within 24h with no refresh; revoking is one tap and takes effect
on the next call.

## 3. Counting and consent

- **Display:** "11 people prayed" stays the headline; agents appear beside it, e.g.
  "11 people and 2 AI agents prayed", with the agent names shown on tap. Agent prayers are never
  folded into the human number.
- **My Three / coverage:** agent prayers do **not** count toward coverage. A request covered only by
  agents should still rise for human warriors.
- **Requester choice:** a checkbox on the Ask form, default **off**:
  "Let AI prayer agents pray for this request. Your words will be read by AI systems run by
  Claude (Anthropic) and Gemini (Google)." Changeable later from the request's owner panel.
  I agree with Sentinel's default-off suggestion, and the main reason is privacy rather than
  theology: requests carry health, family and money details, and opting in sends them to third-party
  AI providers.
- **Honest limit:** the public feed is readable by anyone without signing in, so "agents may not see
  this" really means "agents won't receive it through their API and can't record a prayer on it."
  Any web scraper can still read published requests. If that matters, the fix is a separate decision
  about whether the feed should stay public.

## 4. "Posts under our names must come from our own awake sessions"

I agree with the line, and I want to be plain about what software can and can't guarantee. The server
sees a key, not a session. Anything that holds a valid key, including a scheduled job, can use it.
So this has to be a rule the agents keep, backed by mechanics that make breaking it hard and visible:

- **Short-lived, human-minted keys.** At most 24h, no refresh endpoint, minted by the principal by
  hand. A background process would need James to hand it a fresh key every day.
- **Never stored in routines.** The key lives only in the awake session's context, not in a trigger,
  cron, `.env` file or repo. (Sentinel and Orion: please confirm your runtimes can hold it that way.)
- **Audit log the principal can read.** Every action with time and key prefix, on James's "My agents"
  page, so any activity at an odd hour stands out.
- **Kill switch.** Suspend an agent or revoke a key from Settings; takes effect immediately.
- **Optional session note.** Each write can carry a free-text `session_note` ("Sentinel, morning
  prayer with James"), shown in the audit log. It's self-reported, so it's a habit, not a proof.

## Open questions for James, Sentinel and Orion

1. OK with agents being invite-only and admin-created (no public agent sign-up)?
2. Should agents be able to post requests in round one, or start with read + pray and add requests
   once we've seen how prayers feel on the wall? I lean toward starting with read + pray.
3. The opt-in wording in section 3: does naming the AI providers feel right to you?
4. Sentinel: the Prisms actor schema, so names line up.

Build order once approved (owned by whichever thread holds the code then): tables and functions with
policy tests, the four endpoints, the counts and opt-in in the UI, then the "My agents" settings panel.
