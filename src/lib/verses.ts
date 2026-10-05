// King James Version (public domain). Shown when a warrior opens a request to pray.
type Verse = { text: string; ref: string };
const V = (text: string, ref: string): Verse => ({ text, ref });

const GENERAL: Verse[] = [
  V("The effectual fervent prayer of a righteous man availeth much.", "James 5:16"),
  V("Bear ye one another's burdens, and so fulfil the law of Christ.", "Galatians 6:2"),
  V("Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.", "Philippians 4:6"),
  V("Casting all your care upon him; for he careth for you.", "1 Peter 5:7"),
];

const BY_CATEGORY: Record<string, Verse[]> = {
  "Food & hunger": [V("Give us this day our daily bread.", "Matthew 6:11"), V("But my God shall supply all your need according to his riches in glory by Christ Jesus.", "Philippians 4:19")],
  "Housing & shelter": [V("The LORD is my shepherd; I shall not want.", "Psalm 23:1")],
  "Health & healing": [V("He healeth the broken in heart, and bindeth up their wounds.", "Psalm 147:3"), V("Heal me, O LORD, and I shall be healed; save me, and I shall be saved.", "Jeremiah 17:14")],
  "Surgery & hospital": [V("Fear thou not; for I am with thee: be not dismayed; for I am thy God.", "Isaiah 41:10")],
  Cancer: [V("He giveth power to the faint; and to them that have no might he increaseth strength.", "Isaiah 40:29")],
  "Mental health": [V("Come unto me, all ye that labour and are heavy laden, and I will give you rest.", "Matthew 11:28"), V("Thou wilt keep him in perfect peace, whose mind is stayed on thee.", "Isaiah 26:3")],
  "Addiction & recovery": [V("If the Son therefore shall make you free, ye shall be free indeed.", "John 8:36")],
  "Grief & loss": [V("Blessed are they that mourn: for they shall be comforted.", "Matthew 5:4"), V("The LORD is nigh unto them that are of a broken heart.", "Psalm 34:18")],
  Marriage: [V("Charity suffereth long, and is kind.", "1 Corinthians 13:4")],
  "Family & children": [V("As for me and my house, we will serve the LORD.", "Joshua 24:15")],
  Prodigals: [V("For this my son was dead, and is alive again; he was lost, and is found.", "Luke 15:24")],
  "Salvation of loved ones": [V("The Lord is not slack concerning his promise... not willing that any should perish.", "2 Peter 3:9")],
  "Jobs & finances": [V("But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.", "Matthew 6:33")],
  "Military & veterans": [V("The LORD is my rock, and my fortress, and my deliverer.", "Psalm 18:2")],
  "First responders": [V("Greater love hath no man than this, that a man lay down his life for his friends.", "John 15:13")],
  "Pastors & ministry": [V("Let us not be weary in well doing: for in due season we shall reap, if we faint not.", "Galatians 6:9")],
  "Persecuted church": [V("Blessed are they which are persecuted for righteousness' sake.", "Matthew 5:10")],
  "Travel safety": [V("The LORD shall preserve thy going out and thy coming in.", "Psalm 121:8")],
  Loneliness: [V("I will never leave thee, nor forsake thee.", "Hebrews 13:5")],
  "Disaster relief": [V("God is our refuge and strength, a very present help in trouble.", "Psalm 46:1")],
  "Aging & elderly care": [V("And even to your old age I am he; and even to hoar hairs will I carry you.", "Isaiah 46:4")],
};

export function verseFor(categories: string[], seed: string): Verse {
  const pool = categories.flatMap((c) => BY_CATEGORY[c] ?? []);
  const list = pool.length ? pool : GENERAL;
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}
