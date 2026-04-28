import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(__dirname, "..", "data", "posted-tweets.json");

interface PostedTweet {
  id: string;
  text: string;
  tone: string;
  rationale: string;
  postedAt: string;
  twitterId?: string;
}

interface State {
  posted: PostedTweet[];
}

function loadState(): State {
  if (!existsSync(STATE_FILE)) {
    return { posted: [] };
  }
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { posted: [] };
  }
}

function saveState(state: State): void {
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

export async function getPostedHistory(): Promise<string[]> {
  return loadState().posted.map(p => p.text);
}

export async function recordPostedTweet(entry: Omit<PostedTweet, "id" | "postedAt"> & { twitterId?: string }): Promise<void> {
  const state = loadState();
  state.posted.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    postedAt: new Date().toISOString(),
    ...entry,
  });
  // Sadece son 200 tweet'i tut
  if (state.posted.length > 200) {
    state.posted = state.posted.slice(-200);
  }
  saveState(state);
}

export async function postedTodayCount(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  return loadState().posted.filter(p => p.postedAt.slice(0, 10) === today).length;
}
