import { analyzeProject } from "./analyze.js";
import { generateTweet, type GeneratedTweet } from "./generate.js";
import { sendApprovalRequest, sendNotice, waitForApproval, markPosted, markRejected } from "./telegram.js";
import { postTweet } from "./twitter.js";
import { recordPostedTweet, postedTodayCount } from "./state.js";

const MAX_REGENERATIONS = 3;
const MAX_TWEETS_PER_DAY = 2;

async function main(): Promise<void> {
  console.log(`[${new Date().toISOString()}] NetOku Tweet Agent baslatildi`);

  const todayCount = await postedTodayCount();
  if (todayCount >= MAX_TWEETS_PER_DAY) {
    console.log(`Bugun zaten ${todayCount} tweet postlandi, limit ${MAX_TWEETS_PER_DAY}. Cikiyorum.`);
    return;
  }

  console.log("1. Proje analizi...");
  const ctx = await analyzeProject();
  console.log(`   - ${ctx.recentCommits.length} commit, marketing context ${ctx.marketingContext.length} char`);

  let tweet: GeneratedTweet;
  let messageId: number;
  let regenerations = 0;

  while (true) {
    console.log(`2. Tweet uretiliyor (deneme ${regenerations + 1})...`);
    tweet = await generateTweet(ctx);
    console.log(`   Ton ${tweet.tone}: ${tweet.text}`);

    console.log("3. Telegram onayi gonderiliyor...");
    messageId = await sendApprovalRequest(tweet);

    console.log("4. Onay bekleniyor (max 25 dk)...");
    const result = await waitForApproval(messageId);

    if (result.action === "approve") {
      break;
    }

    if (result.action === "reject") {
      await markRejected(messageId);
      console.log("Tweet reddedildi, cikiyorum.");
      return;
    }

    if (result.action === "timeout") {
      console.log("Zaman asimi, tweet postlanmadi.");
      return;
    }

    if (result.action === "edit") {
      tweet = { ...tweet, text: result.newText, rationale: "Kullanici elle duzenledi" };
      break;
    }

    if (result.action === "regenerate") {
      regenerations++;
      if (regenerations >= MAX_REGENERATIONS) {
        await sendNotice(`⚠️ ${MAX_REGENERATIONS} kez yeniden uretildi, daha fazla denenmiyor.`);
        await markRejected(messageId);
        return;
      }
      continue;
    }
  }

  console.log("5. X'e postlaniyor...");
  try {
    const post = await postTweet(tweet.text);
    await recordPostedTweet({
      text: tweet.text,
      tone: tweet.tone,
      rationale: tweet.rationale,
      twitterId: post.id,
    });
    await markPosted(messageId, post.url);
    console.log(`✅ Tweet postlandi: ${post.url}`);
  } catch (err) {
    const msg = (err as Error).message;
    console.error("X post hatasi:", msg);
    await sendNotice(`❌ *X post hatasi:* \`${msg}\``);
    process.exit(1);
  }
}

main().catch(async err => {
  console.error("Fatal:", err);
  try {
    await sendNotice(`💥 *Tweet Agent fatal hata:* \`${(err as Error).message}\``);
  } catch {}
  process.exit(1);
});
