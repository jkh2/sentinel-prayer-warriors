"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MenuIcon } from "@/components/icons";

// On phones the links fold away behind a labeled Menu button so the header stays one short row.
// On wider screens they show as a row of pills and the button is hidden.
export function Nav({ signedIn, isWarrior, isAdmin }: { signedIn: boolean; isWarrior: boolean; isAdmin: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);
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
    <>
      <button type="button" className="btn btn-quiet menu-btn" aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen(!open)}>
        <MenuIcon open={open} /> <span>{open ? "Close" : "Menu"}</span>
      </button>
      <nav id="main-nav" className={open ? "nav open" : "nav"} aria-label="Main">
        {items.map((i) => (
          <Link key={i.href} href={i.href} onClick={() => setOpen(false)} aria-current={(i.href === "/" ? path === "/" : path.startsWith(i.href)) ? "page" : undefined}>
            {i.label}
          </Link>
        ))}
        {signedIn && (
          <form action="/auth/signout" method="post" className="nav-signout">
            <button className="btn btn-quiet" type="submit">Sign out</button>
          </form>
        )}
      </nav>
    </>
  );
}
