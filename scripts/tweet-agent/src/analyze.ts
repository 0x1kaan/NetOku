import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config.js";

export interface ProjectContext {
  siteTitle: string;
  siteDescription: string;
  siteSnippet: string;
  recentCommits: string[];
  marketingContext: string;
  packageInfo: { name: string; version: string };
}

async function fetchSite(): Promise<{ title: string; description: string; snippet: string }> {
  try {
    const res = await fetch(config.netoku.siteUrl, {
      headers: { "User-Agent": "NetOku-TweetAgent/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return { title: "NetOku", description: "", snippet: "" };
    }
    const html = await res.text();
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    const ogDescMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
    const bodyText = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 2000);

    return {
      title: titleMatch?.[1]?.trim() ?? "NetOku",
      description: (descMatch?.[1] ?? ogDescMatch?.[1] ?? "").trim(),
      snippet: bodyText,
    };
  } catch (err) {
    console.warn("Site fetch failed, devam:", (err as Error).message);
    return { title: "NetOku", description: "", snippet: "" };
  }
}

function getRecentCommits(repoRoot: string, days = 7): string[] {
  try {
    const since = `${days}.days.ago`;
    const out = execSync(`git -C "${repoRoot}" log --since="${since}" --pretty=format:"%s" -n 30`, {
      encoding: "utf8",
    });
    return out
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith("Merge"))
      .slice(0, 20);
  } catch {
    return [];
  }
}

function readMarketingContext(repoRoot: string): string {
  const candidates = ["MARKETING-EXECUTION.md", "MarketingPlan.md", "README.md"];
  const chunks: string[] = [];
  for (const file of candidates) {
    const fp = join(repoRoot, file);
    if (existsSync(fp)) {
      try {
        const txt = readFileSync(fp, "utf8").slice(0, 3000);
        chunks.push(`=== ${file} ===\n${txt}`);
      } catch {}
    }
  }
  return chunks.join("\n\n");
}

function readPackageInfo(repoRoot: string): { name: string; version: string } {
  try {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    return { name: pkg.name ?? "netoku", version: pkg.version ?? "0.0.0" };
  } catch {
    return { name: "netoku", version: "0.0.0" };
  }
}

export async function analyzeProject(): Promise<ProjectContext> {
  const repoRoot = config.netoku.repoRoot;
  const [site] = await Promise.all([fetchSite()]);
  const commits = getRecentCommits(repoRoot);
  const marketing = readMarketingContext(repoRoot);
  const pkg = readPackageInfo(repoRoot);

  return {
    siteTitle: site.title,
    siteDescription: site.description,
    siteSnippet: site.snippet,
    recentCommits: commits,
    marketingContext: marketing,
    packageInfo: pkg,
  };
}
