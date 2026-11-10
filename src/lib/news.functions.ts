import { createServerFn } from "@tanstack/react-start";

export type NewsItem = { title: string; link: string; source: string; date: string };

/** Official Kenyan coffee authorities and trusted outlets whose reports are shown. */
export const VERIFIED_DOMAINS = [
  "afa.go.ke",
  "kilimo.go.ke",
  "kalro.org",
  "nce.co.ke",
  "agriculture.go.ke",
  "kenyanews.go.ke",
  "president.go.ke",
  "nation.africa",
  "standardmedia.co.ke",
  "the-star.co.ke",
  "businessdailyafrica.com",
  "kbc.co.ke",
];

const QUERY =
  'coffee Kenya (farmers OR cooperatives OR "coffee directorate" OR "coffee exchange" OR "coffee research" OR prices OR reforms)';

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export function parseFeed(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1] ?? "";
    const get = (tag: string) => decode(block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? "");
    const sourceUrl = block.match(/<source url="([^"]+)"/)?.[1] ?? "";
    let host = "";
    try {
      host = new URL(sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      continue;
    }
    if (!VERIFIED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) continue;
    const source = get("source");
    items.push({
      title: get("title").replace(new RegExp(`\\s+-\\s+${source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), ""),
      link: get("link"),
      source,
      date: get("pubDate"),
    });
  }
  return items;
}

export const getCoffeeNews = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(QUERY)}+when:60d&hl=en-KE&gl=KE&ceid=KE:en`;
    const res = await fetch(url, { headers: { "User-Agent": "CCAK-Newsroom/1.0" } });
    if (!res.ok) return { items: [] as NewsItem[], error: "News service unavailable" };
    const items = parseFeed(await res.text()).slice(0, 6);
    return { items, error: null as string | null };
  } catch {
    return { items: [] as NewsItem[], error: "News service unavailable" };
  }
});
