import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <div className="stack-lg" style={{ maxWidth: 760 }}>
      <div className="hero">
        <h1>How we use this place together</h1>
        <p>By using Sentinel Prayer Warriors you agree to these simple terms. Last updated October 5, 2026.</p>
      </div>
      <ol className="stack" style={{ margin: 0, paddingLeft: 24 }}>
        <li><strong>This is a place for prayer.</strong> Share real needs and pray for real people. It is not for selling, fundraising, politics or arguments.</li>
        <li><strong>No money requests, links or contact details.</strong> Requests that include them are checked by a reviewer first, and may be removed. Never send money to someone you met here.</li>
        <li><strong>Protect other people’s privacy.</strong> Don’t share another person’s full name, address or private details without their permission.</li>
        <li><strong>Be kind.</strong> Hateful, threatening or sexual content is removed, and accounts that post it may be closed.</li>
        <li><strong>We are not emergency services.</strong> Prayer is powerful, and so is getting help. If anyone is in danger, call 911, or call or text 988 in the US. More help lines are on the <Link href="/help">Help page</Link>.</li>
        <li><strong>Reviewers may remove content</strong> that breaks these terms, and may close accounts that misuse the app.</li>
        <li><strong>You own what you write.</strong> You let us show it to the people you chose to share it with. You can remove it any time.</li>
        <li><strong>The app is offered as is,</strong> without guarantees, and we may change these terms. We will update the date above when we do.</li>
      </ol>
      <p>See also our <Link href="/privacy">privacy promise</Link>.</p>
    </div>
  );
}
