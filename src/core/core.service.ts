import { Model } from 'mongoose';
import { EbayService } from 'src/ebay/ebay.service';
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
    private readonly ebayService: EbayService,
    @InjectModel(Link.name) private linkModel: Model<Link>,
  ) {
    this.checkForNewItems = this.checkForNewItems.bind(this);
    this.init();
  }

  async init() {
    await this.getAllLinksFromDB();
    await this.checkForNewItems();
    setInterval(this.checkForNewItems, 1000 * 60 * 60); // 1 hour
  }

  async getAllLinksFromDB() {
    console.log('getAllLinksFromDB');
    const linksFromDB = await this.linkModel.find().exec();
    this.savedLinks = new Set(linksFromDB.map((link) => link.link));
    console.log('saved links size: ', this.savedLinks.size);
  }

  async checkForNewItems() {
    const linksFromGoogleDoc =
      await this.googleSpreadsheetService.getLinksFromGoogleSheet();

    for (const linkFromGoogleDoc of linksFromGoogleDoc) {
      const productLinksFound = await this.ebayService.searchByUrl(
        linkFromGoogleDoc.url,
      );
      for (const productLink of productLinksFound) {
        await this.addLinkAndNotify(productLink, linkFromGoogleDoc.brandName);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2));
    }
  }

  async addLinkAndNotify(link: string, brandName: string) {
    try {
      console.log('adding link: ', link);
      if (this.savedLinks.has(link)) return;

      await this.linkModel.create({ link });
      this.savedLinks.add(link);
      const formattedBrandName = brandName.replace(/\s+/g, '_');
      await this.telegramService.sendMessageInTelegram(
        `#${formattedBrandName} ${link}`,
      );
    } catch (error) {
      console.log('Error in add link:', error);
      await new Promise((resolve) => setTimeout(resolve, 1000 * 10));
      await this.addLinkAndNotify(link, brandName);
    }
  }

  async debugSearch(brand: string) {
    const url = `https://www.ebay.co.uk/sch/281/i.html?_fsrp=1&_from=R40&_nkw=${brand}&LH_PrefLoc=1&_udhi=8&_sop=10&rt=nc&LH_BIN=1`;
    return this.ebayService.searchByUrl(url);
  }
}
