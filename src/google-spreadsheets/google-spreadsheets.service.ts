import { GoogleSpreadsheet } from 'google-spreadsheet';

import { Injectable } from '@nestjs/common';

@Injectable()
export class GoogleSpreadsheetsService {
  doc: GoogleSpreadsheet;

  constructor() {
    this.doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID);
  }

  async getLinksFromGoogleSheet() {
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
    const links = rows.map((row) => row.Link).filter(Boolean);
    return links;
  }
}
