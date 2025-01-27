import { GoogleSpreadsheet } from 'google-spreadsheet';

import { Injectable } from '@nestjs/common';

@Injectable()
export class GoogleSpreadsheetsService {
  doc: GoogleSpreadsheet;

  constructor() {
    this.doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID);
  }

  async getLinksFromGoogleSheet(): Promise<
    { url: string; brandName: string }[]
  > {
    await this.doc.useServiceAccountAuth({
      private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY.split(
        String.raw`\n`,
      ).join('\n'),
      client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    });
    await this.doc.loadInfo();

    const sheet =
      this.doc.sheetsByTitle[process.env.GOOGLE_SPREADSHEET_WORKSHEET_NAME];
    const rows = await sheet.getRows();
    const linksUK = rows
      .filter((row) => row.SendToTgUK === 'TRUE')
      .map((row) => ({
        url: row.URLUK,
        brandName: `${row.BrandName}_UK`,
      }))
      .filter((link) => link.url);
    const linksUSA = rows
      .filter((row) => row.SendToTgUSA === 'TRUE')
      .map((row) => ({
        url: row.URLUSA,
        brandName: `${row.BrandName}_USA`,
      }))
      .filter((link) => link.url);
    return [...linksUK, ...linksUSA];
  }
}
