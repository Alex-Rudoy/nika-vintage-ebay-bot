import { Telegraf } from 'telegraf';

if (!process.env.TELEGRAM_TOKEN) throw new Error('invalid env');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

const chatIds: number[] = [];
bot.start((ctx) => {
  ctx.reply('Welcome!');
  chatIds.push(ctx.chat.id);
});

bot.help((ctx) => ctx.reply('Send me a sticker'));

bot.on('sticker', (ctx) => ctx.reply('👍'));

bot.hears('hi', (ctx) => ctx.reply('Hey there'));

bot.launch();

export async function sendMessageInTelegram(text: string) {
  const promises = chatIds.map(async (chatId) => {
    await bot.telegram.sendMessage(chatId, text);
  });
  await Promise.all(promises);
}
