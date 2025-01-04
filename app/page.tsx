"use client";
import React, { useCallback, useState } from "react";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";

type Cast = Awaited<
  ReturnType<typeof NeynarAPIClient.prototype.fetchFeed>
>["casts"][0];

const encode = (
  value: string | number | boolean | null | undefined
): string => {
  if (typeof value === "string") {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return String(value);
};

const convertToCSV = (data: Cast[]): string => {
  const headers = [
    "author.fid",
    "author.username",
    "author.displayName",
    "author.pfpUrl",
    "author.custodyAddress",
    "author.bioText",
    "author.followerCount",
    "author.followingCount",
    "author.verifications",
    "author.verifiedEthAddresses",
    "author.powerBadge",
    "thread_hash",
    "parent_hash",
    "parent_url",
    "root_parent_url",
    "parent_author.fid",
    "text",
    "timestamp",
    "url_embeds",
    "cast_embeds",
    "likes_count",
    "recasts_count",
    "replies_count",
  ];
  return [
    headers.join(","),
    ...data.map((cast) =>
      [
        cast.author.fid,
        cast.author.username,
        cast.author.display_name,
        cast.author.pfp_url,
        cast.author.custody_address,
        cast.author.profile.bio.text,
        cast.author.follower_count,
        cast.author.following_count,
        cast.author.verifications.join(","),
        cast.author.verified_addresses.eth_addresses.join(","),
        cast.author.power_badge,
        cast.thread_hash,
        cast.parent_hash,
        cast.parent_url,
        cast.root_parent_url,
        cast.parent_author.fid,
        cast.text,
        cast.timestamp,
        cast.embeds
          .filter((embed) => "url" in embed)
          .map((embed) => embed.url)
          .join(","),
        cast.embeds
          .filter((embed) => "cast" in embed)
          .map((embed) => embed.cast.hash)
          .join(","),
        cast.reactions.likes_count,
        cast.reactions.recasts_count,
        cast.replies.count,
      ]
        .map(encode)
        .join(",")
    ),
  ].join("\n");
};

const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function Home() {
  const [channelId, setChannelId] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>(
    ""
  );
  const [pages, setPages] = useState<number>(10);

  const [showFetchedData, setShowFetchedData] = useState<boolean>(false);
  const [fullResult, setFullResult] = useState<Cast[] | undefined>(undefined);

  const isValid = channelId && apiKey;

  const onDownload = useCallback(async () => {
    if (!isValid) return;

    const client = new NeynarAPIClient({ apiKey });
    const allResults: Cast[] = [];
    let cursor: string | undefined;

    for (let i = 0; i < pages; i++) {
      const feed = await client.fetchFeed({
        feedType: "filter",
        filterType: "channel_id",
        channelId,
        cursor,
      });

      allResults.push(...feed.casts);

      if (!feed.next?.cursor) break;
      cursor = feed.next.cursor;
    }

    setFullResult(allResults);

    const csvContent = convertToCSV(allResults);
    downloadCSV(csvContent, `farcaster_feed_${channelId}.csv`);
  }, [isValid, apiKey, channelId, pages]);

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <div className="flex flex-col gap-4 w-full max-w-md">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Channel ID</span>
            <input
              type="text"
              value={channelId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setChannelId(e.target.value)
              }
              placeholder="Enter Channel ID"
              className="p-2 border rounded text-gray-900 placeholder:text-gray-400"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Neynar API Key</span>
            <input
              type="text"
              value={apiKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setApiKey(e.target.value)
              }
              placeholder="Enter API Key"
              className="p-2 border rounded text-gray-900 placeholder:text-gray-400"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Number of Pages</span>
            <input
              type="number"
              value={pages}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPages(Math.max(1, parseInt(e.target.value) || 1))
              }
              placeholder="Number of pages"
              className="p-2 border rounded text-gray-900 placeholder:text-gray-400"
            />
          </label>
        </div>
        <button
          disabled={!isValid}
          onClick={onDownload}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium shadow-sm hover:shadow-md active:transform active:scale-95"
        >
          Download Data
        </button>

        {fullResult && (
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium shadow-sm hover:shadow-md active:transform active:scale-95"
            onClick={() => setShowFetchedData(!showFetchedData)}
          >
            {showFetchedData ? "Hide fetched" : "Show fetched"}
          </button>
        )}
        {showFetchedData && (
          <code className="text-sm text-gray-400">
            {JSON.stringify(fullResult, null, 2)}
          </code>
        )}
      </main>
    </div>
  );
}
