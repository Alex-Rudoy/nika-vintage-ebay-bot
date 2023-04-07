import { Model } from 'mongoose';
import { Telegraf } from 'telegraf';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ChatId } from './chatId.schema';

@Injectable()
export class TelegramService {
  private chatIds: number[] = [];
  private telegramBot: Telegraf;

  constructor(@InjectModel(ChatId.name) private chatIdModel: Model<ChatId>) {
    this.telegramBot = new Telegraf(process.env.TELEGRAM_TOKEN);

    this.telegramBot.start((ctx) => {
      ctx.reply('Привет булочка)');
      this.addId(ctx.chat.id);
    });

    this.telegramBot.on('sticker', (ctx) => ctx.reply('😂'));

    this.telegramBot.command('quit', async (ctx) => {
      await ctx.telegram.leaveChat(ctx.message.chat.id);
      await ctx.leaveChat();
      this.deleteId(ctx.chat.id);
    });

    this.telegramBot.launch();

    process.once('SIGINT', () => this.telegramBot.stop('SIGINT'));
    process.once('SIGTERM', () => this.telegramBot.stop('SIGTERM'));

    this.getAllChatIdsFromDB();
  }

  async getAllChatIdsFromDB() {
    const chatIdsFromDB = await this.chatIdModel.find().exec();
    this.chatIds = chatIdsFromDB.map((chatId) => chatId.chatId);
  }

  async addId(id: number) {
    await this.chatIdModel.create({ chatId: id });
    this.chatIds.push(id);
  }

  async deleteId(id: number) {
    await this.chatIdModel.deleteOne({ chatId: id });
    this.chatIds.filter((chatId) => chatId !== id);
  }

  async sendMessageInTelegram(text: string) {
    const promises = this.chatIds.map(async (chatId) => {
      await this.telegramBot.telegram.sendMessage(chatId, text);
    });
    await Promise.all(promises);
  }
}
