function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`Missing required env: ${name}`);
  }
  return v.trim();
}

export const config = {
  dryRun: process.env.DRY_RUN === "true",

  anthropic: {
    apiKey: required("ANTHROPIC_API_KEY"),
    model: "claude-haiku-4-5-20251001",
  },

  telegram: {
    botToken: required("TELEGRAM_BOT_TOKEN"),
    chatId: required("TELEGRAM_CHAT_ID"),
    approvalTimeoutMs: 25 * 60 * 1000, // 25 dakika onay bekle
    pollIntervalMs: 5 * 1000,
  },

  twitter: {
    apiKey: required("X_API_KEY"),
    apiSecret: required("X_API_SECRET"),
    accessToken: required("X_ACCESS_TOKEN"),
    accessSecret: required("X_ACCESS_TOKEN_SECRET"),
  },

  netoku: {
    siteUrl: "https://netoku.today",
    repoRoot: process.env.REPO_ROOT || process.cwd().replace(/\\scripts\\tweet-agent$/, "").replace(/\/scripts\/tweet-agent$/, ""),
  },

  // Ton karisimi: A = direkt satis, C = build-in-public
  toneMix: {
    A: 0.5,
    C: 0.5,
  },
} as const;

export type ToneCategory = "A" | "C";
