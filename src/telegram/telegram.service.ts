import {
  DEFAULT_RETRY_DELAYS_MS,
  fetchWithRetry,
  IntervalThrottler,
  parseTelegramRetryAfter,
} from 'src/common/http-retry';

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private static readonly MIN_SEND_INTERVAL_MS = 1100;
  private static readonly MAX_RETRIES = 5;
  private readonly throttler = new IntervalThrottler(
    TelegramService.MIN_SEND_INTERVAL_MS,
  );

  private getChatIds(): number[] {
    const raw = process.env.TELEGRAM_CHAT_IDS;
    if (!raw) {
      throw new Error('TELEGRAM_CHAT_IDS must be set');
    }

    return raw.split(',').map((id) => {
      const parsed = Number(id.trim());
      if (!Number.isFinite(parsed)) {
        throw new Error(`Invalid TELEGRAM_CHAT_IDS entry: ${id}`);
      }
      return parsed;
    });
  }

  async sendMessageInTelegram(text: string): Promise<void> {
    const token = process.env.TELEGRAM_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_TOKEN must be set');
    }

    const chatIds = this.getChatIds();
    const failures: { chatId: number; error: string }[] = [];

    for (const chatId of chatIds) {
      try {
        await this.sendToChat(token, chatId, text);
      } catch (error) {
        failures.push({
          chatId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (failures.length > 0) {
      const details = failures
        .map((f) => `chat ${f.chatId}: ${f.error}`)
        .join('; ');
      throw new Error(`Telegram sendMessage failed: ${details}`);
    }
  }

  private async sendToChat(
    token: string,
    chatId: number,
    text: string,
  ): Promise<void> {
    await this.throttler.wait(chatId);

    const result = await fetchWithRetry(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      },
      {
        maxRetries: TelegramService.MAX_RETRIES,
        retryDelaysMs: DEFAULT_RETRY_DELAYS_MS,
        label: `Telegram sendMessage (chat ${chatId})`,
        logger: this.logger,
        getRetryDelayMs: ({ status, body, attempt }) => {
          if (status === 429) {
            const retryAfter = parseTelegramRetryAfter(body);
            if (retryAfter !== undefined) {
              return retryAfter * 1000 + 500;
            }
          }
          return DEFAULT_RETRY_DELAYS_MS[attempt] ?? 45000;
        },
      },
    );

    if (!result.ok) {
      throw new Error(`${result.status}: ${result.body}`);
    }

    this.throttler.mark(chatId);
  }
}
