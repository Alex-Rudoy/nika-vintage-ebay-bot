import { getUrlsFromGoogleSheet } from './getUrlsFromGoogleSheet';
import { parseHTMLtoItems } from './parseHTMLtoItems';
import { MessageItemType } from './types';

export async function checkForNewItems() {
  const urls = await getUrlsFromGoogleSheet();
  const items: MessageItemType[] = [];
  urls.forEach(async (url) => {
    const item = await parseHTMLtoItems(url);
    // TODO: Check if the item is new (i.e. not already in the database)
    // If it's new, add it to the database and to the list of items
    items.push(item);
  });
  return items;
}
