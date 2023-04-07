import { parse } from 'node-html-parser';

import { MessageItemType } from './types';

export async function parseHTMLtoItems(url: string): Promise<MessageItemType> {
  // TODO: Add error handling for failed requests
  const response = await fetch(url);
  const html = await response.text();
  const root = parse(html);
  const title = root.querySelector('title')?.text || '';
  // TODO: Extract any other relevant information from the HTML
  return { title, url };
}
