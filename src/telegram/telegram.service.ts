import { Model } from 'mongoose';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ChatId } from './chatId.schema';

@Injectable()
export class TelegramService {
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

    await Promise.all(
      chatIds.map(async (chatId) => {
        const response = await fetch(
          `https://api.telegram.org/bot${token}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text }),
          },
        );

        if (!response.ok) {
          const body = await response.text();
          failures.push({ chatId, error: `${response.status}: ${body}` });
        }
      }),
    );

    if (failures.length > 0) {
      const details = failures
        .map((f) => `chat ${f.chatId}: ${f.error}`)
        .join('; ');
      throw new Error(`Telegram sendMessage failed: ${details}`);
    }
  }
}
