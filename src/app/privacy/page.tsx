import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/contact";

export const metadata: Metadata = { title: "Privacy" };

const UPDATED = "October 5, 2026";

export default function PrivacyPage() {
  return (
    <div className="stack-lg" style={{ maxWidth: 760 }}>
      <div className="hero">
        <h1>Our privacy promise</h1>
        <p>Sentinel Prayer Warriors exists so people can pray for one another. We collect only what that needs, and we never sell it. Last updated {UPDATED}.</p>
      </div>

      <section className="stack">
        <h2>What we keep</h2>
        <ul className="stack" style={{ margin: 0, paddingLeft: 20 }}>
          <li><strong>From your Google or Facebook sign-in:</strong> your email address and name, so we know it’s really you. We never show your email or last name to anyone, and we never post anything to those accounts.</li>
          <li><strong>What you choose to share:</strong> your prayer requests, updates and praise reports, with the first name you pick or “Anonymous”, and the general area if you add one.</li>
          <li><strong>Your settings:</strong> whether you pray, ask, or both; the needs you care about; the needs you have walked through yourself (private, used only to match you); your Watch hours; and the circles you belong to.</li>
          <li><strong>Your prayers:</strong> which requests you prayed for or adopted. Requesters see only a count, never who prayed.</li>
          <li><strong>Your Inbox notes</strong>, and any reports you make about a request.</li>
        </ul>
      </section>

      <section className="stack">
        <h2>Who can see what</h2>
        <ul className="stack" style={{ margin: 0, paddingLeft: 20 }}>
          <li>Requests shared with everyone can be read by anyone who visits, without signing in.</li>
          <li>Requests shared with a circle can be seen only by that circle’s members.</li>
          <li>Who wrote a request is never shown, not even to other members. Circle leaders can see the first names of their members so they can remove someone if needed.</li>
          <li>Our reviewers can see requests that are held for review or reported, including circle requests, so they can protect people from scams and help anyone in danger.</li>
        </ul>
      </section>

      <section className="stack">
        <h2>Who helps us run it</h2>
        <p>Our data is stored with Supabase and the app is hosted by Vercel, both in the United States. Google (and Facebook, when you choose it) handle sign-in. We have no advertisers and we don’t sell or share your information with anyone else.</p>
      </section>

      <section className="stack">
        <h2>How long we keep it</h2>
        <p>Requests leave the prayer feed after 30 days. Everything else stays until you delete your account.</p>
      </section>

      <section className="stack" id="delete">
        <h2>Deleting your data</h2>
        <p>You can delete your account at any time. Go to <Link href="/settings#delete">Settings</Link>, scroll to the bottom, and tap <strong>Delete my account</strong>. This removes your account, your settings, your prayers, your Watch hours and your circle memberships right away, and takes your requests off the feed.</p>
        <p>If you can’t sign in any more and want your data removed, {CONTACT_EMAIL ? <>write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the email address you signed in with</> : "contact us through the Help page"} and we will delete it for you.</p>
      </section>

      <section className="stack">
        <h2>Children</h2>
        <p>Sentinel Prayer Warriors is for people 13 and older.</p>
      </section>

      {CONTACT_EMAIL && (
        <section className="stack">
          <h2>Questions</h2>
          <p>Write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
        </section>
      )}
    </div>
  );
}
