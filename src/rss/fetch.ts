import { XMLParser } from "fast-xml-parser";

export type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

export type RSSFeed = {
  channel: {
    title: string;
    link: string;
    description: string;
    item: RSSItem[];
  };
};

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Feed field ${field} is missing or invalid`);
  }
  return value;
}

export async function fetchFeed(feedURL: string, signal?: AbortSignal): Promise<RSSFeed> {
  const response = await fetch(feedURL, { headers: { "User-Agent": "gator" }, signal });
  if (!response.ok) throw new Error(`Failed to fetch feed: ${response.status}`);

  const parser = new XMLParser({ processEntities: false });
  const parsed: unknown = parser.parse(await response.text());
  if (typeof parsed !== "object" || parsed === null || !("rss" in parsed)) {
    throw new Error("Feed does not contain an RSS document");
  }
  const rss = parsed.rss;
  if (typeof rss !== "object" || rss === null || !("channel" in rss)) {
    throw new Error("RSS document does not contain a channel");
  }
  const channel = rss.channel;
  if (typeof channel !== "object" || channel === null) {
    throw new Error("RSS channel is invalid");
  }
  const channelRecord = channel as Record<string, unknown>;

  const rawItems = channelRecord.item;
  const itemRecords = rawItems === undefined ? [] : Array.isArray(rawItems) ? rawItems : [rawItems];
  const items = itemRecords.flatMap((item): RSSItem[] => {
    if (typeof item !== "object" || item === null) return [];
    const record = item as Record<string, unknown>;
    if ([record.title, record.link, record.description, record.pubDate].some((v) => typeof v !== "string" || !v)) return [];
    return [{
      title: record.title as string,
      link: record.link as string,
      description: record.description as string,
      pubDate: record.pubDate as string,
    }];
  });

  return {
    channel: {
      title: requiredString(channelRecord.title, "channel.title"),
      link: requiredString(channelRecord.link, "channel.link"),
      description: requiredString(channelRecord.description, "channel.description"),
      item: items,
    },
  };
}
