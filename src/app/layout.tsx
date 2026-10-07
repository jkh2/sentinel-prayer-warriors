import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Young_Serif } from "next/font/google";
import Link from "next/link";
import { getViewer } from "@/lib/supabase/server";
import { Nav } from "@/components/Nav";
import { BellIcon } from "@/components/icons";
import Image from "next/image";
import "./globals.css";

const body = Atkinson_Hyperlegible_Next({ variable: "--font-atkinson", subsets: ["latin"] });
const display = Young_Serif({ variable: "--font-young-serif", subsets: ["latin"], weight: "400" });

export const viewport = { themeColor: "#060504", colorScheme: "dark" };

export const metadata: Metadata = {
  title: { default: "Sentinel Prayer Warriors", template: "%s · Sentinel Prayer Warriors" },
  description: "Ask for prayer, or pray for people by name. A place to bear one another's burdens.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { supabase, user, profile } = await getViewer();
  const unread = user ? ((await supabase.rpc("unread_notifications")).data as number | null) ?? 0 : 0;
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body>
        <header className="site-header">
          <div className="wrap">
            <div className="bar">
              <Link href="/" className="brand">
                <Image src="/sentinel-mark-nav.png" alt="" width={40} height={34} priority />
                <span className="brand-name">Sentinel <span>Prayer Warriors</span></span>
              </Link>
              <div className="bar-actions">
                {user ? (
                  <>
                    <Link href="/inbox" className="btn btn-quiet inbox-link" aria-label={unread ? `Inbox, ${unread} new` : "Inbox"}>
                      <BellIcon /> Inbox{unread > 0 && <span className="unread">{unread > 99 ? "99+" : unread}</span>}
                    </Link>
                    <form action="/auth/signout" method="post" className="bar-signout">
                      <button className="btn btn-quiet" type="submit">Sign out</button>
                    </form>
                  </>
                ) : (
                  <Link href="/login" className="btn btn-primary sign-in">Sign in</Link>
                )}
                <Nav signedIn={!!user} isWarrior={!!profile?.is_warrior} isAdmin={!!profile?.is_admin} />
              </div>
            </div>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="site-footer">
          <div className="wrap stack">
            <p>“Bear ye one another’s burdens, and so fulfil the law of Christ.” Galatians 6:2</p>
            <p>
              In danger or thinking about suicide? In the US call or text <strong>988</strong>, or call <strong>911</strong>.{" "}
              <Link href="/help">Get help and learn how this works</Link>
            </p>
            <p><Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link></p>
          </div>
        </footer>
      </body>
    </html>
  );
}
