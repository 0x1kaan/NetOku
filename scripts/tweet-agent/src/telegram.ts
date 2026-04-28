import { config } from "./config.js";
import type { GeneratedTweet } from "./generate.js";

const API = (method: string) => `https://api.telegram.org/bot${config.telegram.botToken}/${method}`;

interface TgUpdate {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number };
    text?: string;
    reply_to_message?: { message_id: number };
  };
  callback_query?: {
    id: string;
    from: { id: number };
    message: { message_id: number; chat: { id: number } };
    data: string;
  };
}

async function tgCall<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(API(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!json.ok) {
    throw new Error(`Telegram ${method} failed: ${json.description}`);
  }
  return json.result as T;
}

export async function sendApprovalRequest(tweet: GeneratedTweet): Promise<number> {
  const text =
    `📝 *NetOku Tweet Onayi*\n\n` +
    `*Ton:* ${tweet.tone === "A" ? "A — Direkt deger" : "C — Build-in-public"}\n` +
    `*Karakter:* ${tweet.text.length}/280\n\n` +
    `\`\`\`\n${tweet.text}\n\`\`\`\n\n` +
    `_Gerekce: ${tweet.rationale}_\n\n` +
    `*Onay icin asagidaki butonu kullan, ya da yeni metni REPLY olarak yaz (ben onun yerine onu postlarim).*`;

  const result = await tgCall<{ message_id: number }>("sendMessage", {
    chat_id: config.telegram.chatId,
    text,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Onayla", callback_data: "approve" },
          { text: "❌ Reddet", callback_data: "reject" },
          { text: "🔄 Yeniden Uret", callback_data: "regenerate" },
        ],
      ],
    },
  });

  return result.message_id;
}

export async function sendNotice(text: string): Promise<void> {
  await tgCall("sendMessage", {
    chat_id: config.telegram.chatId,
    text,
    parse_mode: "Markdown",
  });
}

async function answerCallback(callbackId: string, text?: string): Promise<void> {
  await tgCall("answerCallbackQuery", { callback_query_id: callbackId, text });
}

async function editMessage(messageId: number, text: string): Promise<void> {
  await tgCall("editMessageText", {
    chat_id: config.telegram.chatId,
    message_id: messageId,
    text,
    parse_mode: "Markdown",
  });
}

export type ApprovalResult =
  | { action: "approve" }
  | { action: "reject" }
  | { action: "regenerate" }
  | { action: "edit"; newText: string }
  | { action: "timeout" };

export async function waitForApproval(messageId: number): Promise<ApprovalResult> {
  const start = Date.now();
  let lastUpdateId = 0;

  // Onceki update'leri temizle
  try {
    const initial = await tgCall<TgUpdate[]>("getUpdates", { offset: -1, timeout: 0 });
    if (initial.length > 0) {
      lastUpdateId = initial[initial.length - 1].update_id;
    }
  } catch {}

  while (Date.now() - start < config.telegram.approvalTimeoutMs) {
    try {
      const updates = await tgCall<TgUpdate[]>("getUpdates", {
        offset: lastUpdateId + 1,
        timeout: 25, // long polling
      });

      for (const upd of updates) {
        lastUpdateId = upd.update_id;

        if (upd.callback_query) {
          const cq = upd.callback_query;
          if (cq.message.chat.id.toString() !== config.telegram.chatId) continue;
          if (cq.message.message_id !== messageId) continue;

          const action = cq.data;
          await answerCallback(cq.id, `Karar: ${action}`);

          if (action === "approve") return { action: "approve" };
          if (action === "reject") return { action: "reject" };
          if (action === "regenerate") return { action: "regenerate" };
        }

        if (upd.message?.text && upd.message.reply_to_message?.message_id === messageId) {
          if (upd.message.chat.id.toString() !== config.telegram.chatId) continue;
          const newText = upd.message.text.trim();
          if (newText.length > 0 && newText.length <= 280) {
            return { action: "edit", newText };
          }
        }
      }
    } catch (err) {
      console.warn("getUpdates hatasi, devam:", (err as Error).message);
      await new Promise(r => setTimeout(r, config.telegram.pollIntervalMs));
    }
  }

  await editMessage(messageId, "⏰ *Tweet onay zaman asimina ugradi, postlanmadi.*");
  return { action: "timeout" };
}

export async function markPosted(messageId: number, twitterUrl: string): Promise<void> {
  await editMessage(messageId, `✅ *Postlandi:* ${twitterUrl}`);
}

export async function markRejected(messageId: number): Promise<void> {
  await editMessage(messageId, "❌ *Reddedildi, postlanmadi.*");
}
