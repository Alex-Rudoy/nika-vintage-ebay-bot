import { Model } from 'mongoose';
import { parse } from 'node-html-parser';
import { GoogleSpreadsheetsService } from 'src/google-spreadsheets/google-spreadsheets.service';
import { TelegramService } from 'src/telegram/telegram.service';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Link } from './link.schema';

@Injectable()
export class CoreService {
  savedLinks: Set<string> = new Set();

  constructor(
    private readonly googleSpreadsheetService: GoogleSpreadsheetsService,
    private readonly telegramService: TelegramService,
    @InjectModel(Link.name) private linkModel: Model<Link>,
  ) {
    this.checkForNewItems = this.checkForNewItems.bind(this);
    this.init();
  }

  async init() {
    await this.getAllLinksFromDB();
    this.checkForNewItems();
    setInterval(this.checkForNewItems, 1000 * 60 * 60); // 1 hour
  }

  async getAllLinksFromDB() {
    const linksFromDB = await this.linkModel.find().exec();
    this.savedLinks = new Set(linksFromDB.map((link) => link.link));
  }

  async checkForNewItems() {
    await this.getAllLinksFromDB();
    console.log('Checking for new items...');
    const linksFromGoogleDoc =
      await this.googleSpreadsheetService.getLinksFromGoogleSheet();

    for (const link of linksFromGoogleDoc) {
      const productLinksFound = await this.getProductLinksFromHTML(link);
      productLinksFound
        .map((productLink) => productLink.split('?')[0]) // remove query params
        .forEach(async (productLink) => {
          if (this.savedLinks.has(productLink)) return;

          this.savedLinks.add(productLink);
          await this.linkModel.create({ link: productLink });
          await this.telegramService.sendMessageInTelegram(productLink);
        });
      await new Promise((resolve) => setTimeout(resolve, 5000)); // wait 5 second to not get banned by ebay
    }
  }

  async getProductLinksFromHTML(ebayListLink: string): Promise<string[]> {
    console.log('Parsing ', ebayListLink);
    const productLinksOnPage: string[] = [];
    try {
      const response = await fetch(`${ebayListLink}&_fcid=3`);
      const html = await response.text();
      const root = parse(html);
      const listOfResults = root.querySelectorAll('ul.srp-results li');

      for (const listItem of listOfResults) {
        if (listItem.classList.contains('s-item')) {
          const newLink = listItem
            .querySelector('a.s-item__link')
            ?.getAttribute('href');

          if (newLink) productLinksOnPage.push(newLink);
        }

        if (listItem.classList.contains('srp-river-answer--REWRITE_START')) {
          return productLinksOnPage; // stop parsing if hit the banner
        }
      }
      return productLinksOnPage;
    } catch (error) {
      console.log('Error while parsing HTML: ', error);
      return [];
    }
  }

  async showThePage(link: string): Promise<string> {
    const response = await fetch(`${link}&_fcid=3`);
    const html = await response.text();
    return html;
  }
}
