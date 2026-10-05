import type { Metadata } from "next";
import Link from "next/link";
import { CRISIS_LINES, LOCAL_HELP } from "@/lib/help";

export const metadata: Metadata = { title: "Help" };

const QA: [string, React.ReactNode][] = [
  ["What is Sentinel Prayer Warriors?", "A place where people who need prayer can ask for it, and people who love to pray can pray for them by name. It is not a social network. There are no followers, likes, or comments. Only prayer."],
  ["Do I need an account?", <>No account is needed to read the prayer feed. To pray and be counted, or to ask for prayer, sign in with your Google or Facebook account. <Link href="/login">Sign in here</Link>.</>],
  ["Will people see my name or email?", "Never your email or last name. A request shows only the first name you choose, or the word “Anonymous”."],
  ["How do I pray for someone?", <>Open the <Link href="/">Live Prayer Feed</Link>, tap <strong>Pray for…</strong> on any request, pray, then tap <strong>Amen, I prayed</strong>.</>],
  ["What is “My Three”?", "Each day we choose three people for you to pray for. People who haven’t had many prayers come first, then needs you care about. You choose which needs in Settings."],
  ["How do I ask for prayer?", <>Tap <Link href="/ask">Ask for Prayer</Link>, write your request, and tap <strong>Share my request</strong>. You can see how many people prayed and post a praise report when God answers.</>],
  ["Why is my request “waiting for review”?", "Requests that include phone numbers, emails, website links, or talk about money are checked by a person first. This protects everyone from scammers."],
  ["The text is too small to read.", "Hold the Ctrl key (Command on a Mac) and press + to make everything bigger. On a phone, spread two fingers apart on the screen."],
  ["How do I report something wrong?", "Open the request and tap “Report this request” at the bottom. Three reports hide a request until a reviewer looks at it."],
];

export default function HelpPage() {
  return (
    <div className="stack-lg" style={{ maxWidth: 760 }}>
      <h1>Help and questions</h1>
      <section className="notice notice-crisis">
        <h2>If you or someone else is in danger</h2>
        <ul>{CRISIS_LINES.map((c) => <li key={c.name}><strong>{c.name}:</strong> <a href={c.href}>{c.how}</a></li>)}</ul>
      </section>
      <section className="stack">
        {QA.map(([q, a]) => (
          <details key={q} className="card">
            <summary style={{ fontWeight: 700, fontSize: "1.1rem", cursor: "pointer", minHeight: 32 }}>{q}</summary>
            <p style={{ marginTop: 10 }}>{a}</p>
          </details>
        ))}
      </section>
      <section className="notice notice-help">
        <h2>Practical help for food, housing and bills</h2>
        <ul>{LOCAL_HELP.map((c) => <li key={c.name}><strong>{c.name}:</strong> <a href={c.href} target="_blank" rel="noreferrer">{c.how}</a></li>)}</ul>
      </section>
    </div>
  );
}
