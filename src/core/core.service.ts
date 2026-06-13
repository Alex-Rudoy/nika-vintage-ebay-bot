import { Model } from 'mongoose';
import { EbayService } from 'src/ebay/ebay.service';
import { GoogleSpreadsheetsService } from 'src/google-spreadsheets/google-spreadsheets.service';
import { TelegramService } from 'src/telegram/telegram.service';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Link } from './link.schema';

@Injectable()
export class CoreService {
  constructor(
    private readonly googleSpreadsheetService: GoogleSpreadsheetsService,
    private readonly telegramService: TelegramService,
    private readonly ebayService: EbayService,
    @InjectModel(Link.name) private linkModel: Model<Link>,
  ) {}

  async backfillLegacyLinks(): Promise<void> {
    await this.linkModel.updateMany(
      { createdAt: { $exists: false } },
      { $set: { createdAt: new Date() } },
    );
  }

  async cleanupOldLinks(): Promise<void> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    await this.linkModel.deleteMany({ createdAt: { $lt: ninetyDaysAgo } });
  }

  async checkForNewItems(): Promise<void> {
    await this.backfillLegacyLinks();
    await this.cleanupOldLinks();

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

  async addLinkAndNotify(link: string, brandName: string): Promise<void> {
    try {
      await this.linkModel.create({ link, brandName });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: number }).code === 11000
      ) {
        return;
      }
      throw error;
    }

    const formattedBrandName = brandName.replace(/\s+/g, '_');
    try {
      await this.telegramService.sendMessageInTelegram(
        `#${formattedBrandName} ${link}`,
      );
    } catch (error) {
      await this.linkModel.deleteOne({ link });
      throw error;
    }
  }

  async debugSearch(brand: string) {
    const url = `https://www.ebay.co.uk/sch/281/i.html?_fsrp=1&_from=R40&_nkw=${brand}&LH_PrefLoc=1&_udhi=8&_sop=10&rt=nc&LH_BIN=1`;
    return this.ebayService.searchByUrl(url);
  }
}
