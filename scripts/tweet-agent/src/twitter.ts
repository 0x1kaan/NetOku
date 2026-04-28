import { TwitterApi } from "twitter-api-v2";
import { config } from "./config.js";

export interface PostResult {
  id: string;
  url: string;
}

export async function postTweet(text: string): Promise<PostResult> {
  if (config.dryRun) {
    const fakeId = `dryrun-${Date.now()}`;
    console.log(`[DRY RUN] Tweet postlanmadi:\n${text}`);
    return { id: fakeId, url: `https://x.com/dryrun/status/${fakeId}` };
  }

  const client = new TwitterApi({
    appKey: config.twitter.apiKey,
    appSecret: config.twitter.apiSecret,
    accessToken: config.twitter.accessToken,
    accessSecret: config.twitter.accessSecret,
  });

  const me = await client.v2.me().catch(() => null);
  const username = me?.data?.username ?? "i";

  const result = await client.v2.tweet(text);
  const id = result.data.id;
  return {
    id,
    url: `https://x.com/${username}/status/${id}`,
  };
}
