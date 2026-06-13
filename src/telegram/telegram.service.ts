import { Model } from 'mongoose';

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ChatId } from './chatId.schema';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private static readonly MIN_SEND_INTERVAL_MS = 1100;
  private static readonly RETRY_DELAYS_MS = [5000, 15000, 45000];
  private static readonly MAX_RETRIES = 5;
  private readonly lastSendAtByChat = new Map<number, number>();

  constructor(
    @InjectModel(ChatId.name) private readonly chatIdModel: Model<ChatId>,
  ) {}

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
    await this.throttle(chatId);

    for (let attempt = 0; attempt <= TelegramService.MAX_RETRIES; attempt++) {
      const response = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text }),
        },
      );

      if (response.ok) {
        this.lastSendAtByChat.set(chatId, Date.now());
        return;
      }

      const body = await response.text();
      const retryable = response.status === 429 || response.status >= 500;

      if (!retryable || attempt === TelegramService.MAX_RETRIES) {
        throw new Error(`${response.status}: ${body}`);
      }

      const delayMs = this.getRetryDelayMs(response.status, body, attempt);
      this.logger.warn(
        `Telegram API ${response.status} for chat ${chatId}, retry ${
          attempt + 1
        }/${TelegramService.MAX_RETRIES} in ${delayMs}ms`,
      );
      await this.sleep(delayMs);
    }
  }

  private async throttle(chatId: number): Promise<void> {
    const lastSendAt = this.lastSendAtByChat.get(chatId);
    if (lastSendAt === undefined) {
      return;
    }

    const elapsed = Date.now() - lastSendAt;
    const waitMs = TelegramService.MIN_SEND_INTERVAL_MS - elapsed;
    if (waitMs > 0) {
      await this.sleep(waitMs);
    }
  }

  private getRetryDelayMs(
    status: number,
    body: string,
    attempt: number,
  ): number {
    if (status === 429) {
      const retryAfter = this.parseRetryAfter(body);
      if (retryAfter !== undefined) {
        return retryAfter * 1000 + 500;
      }
    }

    return TelegramService.RETRY_DELAYS_MS[attempt] ?? 45000;
  }

  private parseRetryAfter(body: string): number | undefined {
    try {
      const parsed = JSON.parse(body) as {
        parameters?: { retry_after?: number };
      };
      const retryAfter = parsed.parameters?.retry_after;
      if (typeof retryAfter === 'number' && Number.isFinite(retryAfter)) {
        return retryAfter;
      }
    } catch {
      // ignore malformed response body
    }
    return undefined;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
