import { CRISIS_LINES, LOCAL_HELP, PRACTICAL_CATEGORIES } from "@/lib/help";

export function CrisisNotice({ forRequester }: { forRequester?: boolean }) {
  return (
    <section className="notice notice-crisis" role="alert">
      <h2>{forRequester ? "You are not alone. Please reach out right now." : "This person may be in danger"}</h2>
      <p>
        {forRequester
          ? "We are praying, and we also want you safe tonight. These people are ready to talk, any time of day:"
          : "Pray for them, and if you know them personally, help them reach one of these:"}
      </p>
      <ul>
        {CRISIS_LINES.map((c) => (
          <li key={c.name}><strong>{c.name}:</strong> <a href={c.href}>{c.how}</a></li>
        ))}
      </ul>
    </section>
  );
}

export function LocalHelpNotice({ categories, forRequester }: { categories: string[]; forRequester?: boolean }) {
  if (!categories.some((c) => PRACTICAL_CATEGORIES.has(c))) return null;
  return (
    <section className="notice notice-help">
      <h3>{forRequester ? "Help near you" : "Faith with works"}</h3>
      <p>
        {forRequester
          ? "While people pray, these free services can help with food, housing and bills:"
          : "“If a brother or sister be naked, and destitute of daily food… what doth it profit?” James 2:15-16. You can also point people to:"}
      </p>
      <ul>
        {LOCAL_HELP.map((c) => (
          <li key={c.name}><strong>{c.name}:</strong> <a href={c.href} target="_blank" rel="noreferrer">{c.how}</a></li>
        ))}
      </ul>
    </section>
  );
}
