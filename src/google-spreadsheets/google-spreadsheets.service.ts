import { GoogleSpreadsheet } from 'google-spreadsheet';

import { Injectable } from '@nestjs/common';
import {
  buildEbaySearchParams,
  EbaySearchParams,
  Region,
} from 'src/ebay/ebay-search-builder';

export interface BrandSearch {
  searchParams: EbaySearchParams;
  brandName: string;
}

@Injectable()
export class GoogleSpreadsheetsService {
  doc: GoogleSpreadsheet;

  constructor() {
    this.doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID);
  }

  async getBrandSearchesFromGoogleSheet(): Promise<BrandSearch[]> {
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

    const ukSearches = rows
      .filter((row) => row.SendToTgUK === 'TRUE')
      .map((row) =>
        toBrandSearch(row.BrandName, row.MaxPriceUK, row.BuyNowUK, 'UK'),
      )
      .filter((search): search is BrandSearch => search !== null);

    const usaSearches = rows
      .filter((row) => row.SendToTgUSA === 'TRUE')
      .map((row) =>
        toBrandSearch(row.BrandName, row.MaxPriceUSA, row.BuyNowUSA, 'USA'),
      )
      .filter((search): search is BrandSearch => search !== null);

    return [...ukSearches, ...usaSearches];
  }
}

function toBrandSearch(
  brandName: string,
  maxPrice: string | number | undefined,
  buyNow: string | undefined,
  region: Region,
): BrandSearch | null {
  const searchParams = buildEbaySearchParams(
    { brandName, maxPrice, buyNowOnly: buyNow === 'TRUE' },
    region,
  );
  if (!searchParams) return null;

  return { searchParams, brandName: `${brandName}_${region}` };
}
