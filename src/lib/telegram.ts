import { requireServerEnv } from "@/lib/env";

interface TelegramSendMessageResponse {
  ok: boolean;
  result?: {
    message_id: number;
  };
  description?: string;
}

export async function sendTelegramMessage(text: string): Promise<number> {
  const env = requireServerEnv(["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"]);
  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
      }),
    },
  );

  const payload = (await response.json()) as TelegramSendMessageResponse;

  if (!response.ok || !payload.ok || !payload.result) {
    throw new Error(payload.description ?? "Telegram API request failed");
  }

  return payload.result.message_id;
}
