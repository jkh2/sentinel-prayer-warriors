"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav({ signedIn, isWarrior, isAdmin }: { signedIn: boolean; isWarrior: boolean; isAdmin: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/", label: "Live Prayer Feed" },
    ...(isWarrior ? [{ href: "/three", label: "My Three" }] : []),
    { href: "/watch", label: "The Watch" },
    { href: "/ask", label: "Ask for Prayer" },
    ...(signedIn ? [{ href: "/circles", label: "Circles" }, { href: "/me", label: "My Prayers" }, { href: "/settings", label: "Settings" }] : []),
    { href: "/help", label: "Help" },
    ...(isAdmin ? [{ href: "/admin", label: "Review" }] : []),
  ];
  return (
    <nav className="nav" aria-label="Main">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={(i.href === "/" ? path === "/" : path.startsWith(i.href)) ? "page" : undefined}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
