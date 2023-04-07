// import { checkForNewItems } from './checkForNewItems';
// import { FIVE_MINUTES } from './constants';
import { sendMessageInTelegram } from './sendMessageInTelegram';

export function runCron() {
  setInterval(async () => {
    // const items = await checkForNewItems();
    // if (items.length > 0) {
    //   const message = `New items found:\n${items
    //     .map((item) => `${item.title}: ${item.url}`)
    //     .join('\n')}`;
    //   await sendMessageInTelegram(message);
    // }
    await sendMessageInTelegram('test');
  }, 1000 * 10);
}
