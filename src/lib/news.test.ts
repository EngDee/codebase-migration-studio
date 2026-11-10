import { describe, expect, it } from "vitest";
import { parseFeed } from "./news.functions";

const item = (src: string, title: string) =>
  `<item><title>${title} - Src</title><link>https://x/${title}</link><pubDate>Mon, 09 Nov 2026 08:00:00 GMT</pubDate><source url="${src}">Src</source></item>`;

describe("coffee news feed", () => {
  it("keeps only verified sources", () => {
    const xml = item("https://www.afa.go.ke", "Official") + item("https://random-blog.com", "Blog");
    const out = parseFeed(xml);
    expect(out.map((i) => i.title)).toEqual(["Official"]);
  });
});
