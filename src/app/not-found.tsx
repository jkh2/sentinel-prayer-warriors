import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty">
      <h1>We couldn’t find that page</h1>
      <p>The request may have been removed, or the link may be wrong.</p>
      <Link href="/" className="btn btn-primary">Go to the prayer feed</Link>
    </div>
  );
}
