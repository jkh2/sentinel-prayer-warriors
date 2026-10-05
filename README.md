# Sentinel Prayer Warriors

A place for people who want to pray for others to see specific needs, and for people who need prayer to ask for it. It is not a social network: no followers, likes, comments or messages. Only prayer.

## What it does

- **Live Prayer Feed.** Anyone can read requests without an account. New requests arrive live and wait behind a "new requests" button so the page never jumps while someone is reading.
- **Pray for someone.** Each request opens a prayer page with a fitting KJV verse, an optional one-minute prayer circle, and **Amen, I prayed**. The requester sees the count.
- **My Three.** Three people chosen for each warrior. One slot always goes to someone with fewer than three prayers, then needs that match the warrior's interests and what they have lived through, then urgency, with randomness so each draw differs (`src/lib/myThree.ts`).
- **Ask for Prayer.** A four-step form for a first name or Anonymous, up to three kinds of need, and an urgent flag.
- **Close the loop.** Requesters post updates and praise reports. Everyone who prayed sees them under My Prayers.
- **Interests.** 27 built-in kinds of need. People can suggest more, which appear after review.
- **Safety from day one.** Every request is screened in the database (`public.screen_text`). Contact details, links and money requests wait for review. Crisis language shows crisis lines (988, domestic violence hotline, 911) to the requester and on the request. Three reports hide a request until a reviewer looks. Requests expire after 30 days. Each person can post at most 5 requests a day.
- **Faith with works.** Food, housing, job and disaster requests show 211, food bank and findhelp.org links.
- **The Watch.** Warriors keep weekly prayer hours in their own time zone. Everyone can see how many are on watch now and which hours still need someone; a warrior's own hour shows a reminder on the home page (`src/lib/watch.ts`).
- **Adopt a person.** After praying, a warrior can carry someone for 7 days. My Prayers and the home page remind them each day, and the requester sees that people are praying all week.
- **Inbox.** In-app notes when people pray for your request (at milestones), when someone adopts it, when someone you prayed for posts an update or praise report, when a held request is approved, and when a circle gets a new request.
- **Circles.** Private prayer walls for churches, small groups and families, joined by invitation link. Circle requests are visible only to members (enforced by RLS). Leaders can remove members and requests and make a new link.
- **Account deletion** in Settings, with a privacy page and terms (`/privacy`, `/terms`).
- **Built for everyone.** Large Atkinson Hyperlegible text, big buttons, plain words, and step-by-step guides on every main page that people can hide and bring back in Settings.

## Privacy model

`prayer_requests` holds no author column. Who wrote each request lives in `request_authors`, which no client can read. All writes go through security-definer functions (`submit_request`, `pray_for`, `post_update`, …) so moderation cannot be skipped. Who prayed for whom is visible only to the person who prayed. Admin is a profile flag that users cannot set themselves.

## Setup

1. Create a Supabase project and run `supabase/migrations/*.sql` (with the Supabase CLI: `supabase db push`).
2. In Supabase **Authentication → Providers**, turn on **Google** and **Facebook**. Each needs an OAuth app from Google Cloud Console and Meta for Developers. Add `https://<your-domain>/auth/callback` to the allowed redirect URLs.
3. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key. Set `NEXT_PUBLIC_FACEBOOK_LOGIN=on` once Facebook is enabled, and `NEXT_PUBLIC_CONTACT_EMAIL` for the privacy page.
4. `npm install` then `npm run dev`.
5. Make yourself a reviewer by running `update public.profiles set is_admin = true where id = '<your user id>';` in the SQL editor.
6. Deploy to Vercel with the same two environment variables.

## Checks

- `npm run typecheck`, `npm run lint` and `npm test` (unit tests for moderation and My Three)
- `npm run test:db` applies the migrations to a throwaway local Postgres database and tests every access rule

## Next up

- **Email notifications** on top of the Inbox (needs a sending service such as Resend)
- Phone apps for the app stores
