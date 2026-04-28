import OpenAI from "openai";
import { config, type ToneCategory } from "./config.js";
import type { ProjectContext } from "./analyze.js";
import { getPostedHistory } from "./state.js";

export interface GeneratedTweet {
  text: string;
  tone: ToneCategory;
  rationale: string;
}

function pickTone(): ToneCategory {
  return Math.random() < config.toneMix.A ? "A" : "C";
}

const TONE_GUIDE: Record<ToneCategory, string> = {
  A: `Ton A — Direkt deger/satis odakli:
- Bir somut faydayi tek cumlede acikla
- "X dakikada Y yap" gibi olculebilir vaat
- Hicbir abartma, hicbir "devrim", "en iyi" kelimesi
- Maksimum 1 emoji veya hic
- Cagri (CTA) opsiyonel: "netoku.today"
- Ornek: "Sensor loglarini Excel'e aktarip filtrelemekle ugrasma. NetOku 200MB log'u 90 saniyede sinifliyor."`,

  C: `Ton C — Build-in-public, kanit-temelli:
- Bu hafta NE eklendi/duzeltildi/ogrenildi
- Cozdugu somut sorunu acikla
- Sayisal/olculebilir bir detay (suresi, yuzde, sayi)
- Ben/biz dili dogal — abartisiz
- Hashtag yok, emoji 0-1
- Ornek: "Bu hafta NetOku'ya batch analiz ekledim. Tek seferde 50 sensor dosyasi. Onceden 50 ayri upload gerekiyordu — bir kullanici geri bildiriminden cikti."`,
};

const SYSTEM_PROMPT = `Sen NetOku adli SaaS urununun kurucususun ve bizzat tweet atiyorsun.

NetOku nedir: Sensor verisi/log dosyalari analizi yapan B2B SaaS. Hedef: muhendislik ekipleri, kalite kontrol, IoT firmalari.

Tweet kurallari:
1. TURKCE yaz
2. Maksimum 270 karakter (link icin pay birak)
3. Tek dusunce, tek mesaj
4. Hashtag KULLANMA (organik gorunsun)
5. Emoji 0-1 tane (ozellikle gerekiyorsa)
6. ASLA: "devrim", "her sey degisti", "hayatini degistir", "muhtesem", "best ever" gibi sisirme
7. ASLA clickbait: "buna inanmayacaksin", "kimse bilmiyor"
8. Somut ol: sayi, sure, dosya boyutu, yuzde, ornek senaryo
9. Tek sorudan kacin (etkilesim avciligi gibi gorunmesin)
10. Ozel link gerekiyorsa sadece "netoku.today" ekle, baska URL yok

Sadece JSON dondur:
{"text": "<tweet metni>", "rationale": "<bu mesaji neden sectin, 1 cumle>"}`;

function buildUserPrompt(ctx: ProjectContext, tone: ToneCategory, history: string[]): string {
  const recent = history.slice(-10).map((t, i) => `${i + 1}. ${t}`).join("\n") || "(henuz tweet yok)";
  const commits = ctx.recentCommits.length > 0 ? ctx.recentCommits.join("\n") : "(son 7 gun commit yok)";
  const marketing = ctx.marketingContext.slice(0, 4000);

  return `## NetOku Site Bilgileri

Title: ${ctx.siteTitle}
Description: ${ctx.siteDescription}
Snippet: ${ctx.siteSnippet.slice(0, 800)}

## Son Git Commit'leri (son 7 gun)
${commits}

## Marketing Plani (ozet)
${marketing}

## Onceki Tweetler (TEKRARLAMA)
${recent}

## Gorev
Yukaridaki ton rehberine sadik kalarak BUGUN icin 1 tweet uret:

${TONE_GUIDE[tone]}

Onceki tweetleri tekrarlama, ayni cumle yapisini kullanma, ayni faydayi anlatma.
Sadece JSON dondur.`;
}

export async function generateTweet(ctx: ProjectContext): Promise<GeneratedTweet> {
  const tone = pickTone();
  const history = await getPostedHistory();
  const client = new OpenAI({ apiKey: config.openai.apiKey });

  const resp = await client.chat.completions.create({
    model: config.openai.model,
    max_tokens: 1024,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(ctx, tone, history) },
    ],
  });

  const raw = resp.choices[0]?.message?.content?.trim() ?? "";
  if (!raw) {
    throw new Error("OpenAI'dan response gelmedi");
  }

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`JSON bulunamadi: ${raw}`);
  }

  let parsed: { text: string; rationale: string };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    throw new Error(`JSON parse hatasi: ${(err as Error).message}\nRaw: ${raw}`);
  }

  if (!parsed.text || typeof parsed.text !== "string") {
    throw new Error(`Gecersiz tweet text: ${JSON.stringify(parsed)}`);
  }

  let text = parsed.text.trim();
  if (text.length > 280) {
    text = text.slice(0, 277) + "...";
  }

  return {
    text,
    tone,
    rationale: parsed.rationale ?? "",
  };
}
