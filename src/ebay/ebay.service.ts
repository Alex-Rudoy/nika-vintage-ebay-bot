import { Injectable, Logger } from '@nestjs/common';
import { EbaySearchParams, parseEbaySearchUrl } from './ebay-url-parser';

interface OAuthTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface ItemSummary {
  itemId: string;
  itemWebUrl?: string;
  title?: string;
}

interface SearchResponse {
  itemSummaries?: ItemSummary[];
  total?: number;
}

@Injectable()
export class EbayService {
  private readonly logger = new Logger(EbayService.name);
  private accessToken?: string;
  private tokenExpiresAt = 0;

  private get apiBase(): string {
    return process.env.EBAY_ENVIRONMENT === 'sandbox'
      ? 'https://api.sandbox.ebay.com'
      : 'https://api.ebay.com';
  }

  async searchByUrl(ebaySearchUrl: string): Promise<string[]> {
    const params = parseEbaySearchUrl(ebaySearchUrl);
    return this.search(params);
  }

  async search(params: EbaySearchParams): Promise<string[]> {
    const token = await this.getAccessToken();
    const query = new URLSearchParams();

    if (params.q) query.set('q', params.q);
    if (params.categoryIds) query.set('category_ids', params.categoryIds);
    if (params.sort) query.set('sort', params.sort);
    if (params.filters.length) query.set('filter', params.filters.join(','));
    query.set('limit', '50');

    const url = `${this.apiBase}/buy/browse/v1/item_summary/search?${query}`;

    this.logger.log(`eBay API search: ${url}`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': params.marketplaceId,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`eBay API error ${response.status}: ${body}`);
      return [];
    }

    const data = (await response.json()) as SearchResponse;
    const items = data.itemSummaries ?? [];

    this.logger.log(
      `eBay API returned ${items.length} items (total: ${data.total ?? 0})`,
    );

    return items
      .map((item) => item.itemWebUrl?.split('?')[0])
      .filter((url): url is string => Boolean(url));
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const clientId = process.env.EBAY_CLIENT_ID;
    const clientSecret = process.env.EBAY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('EBAY_CLIENT_ID and EBAY_CLIENT_SECRET must be set');
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64',
    );

    const response = await fetch(`${this.apiBase}/identity/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'https://api.ebay.com/oauth/api_scope',
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`eBay OAuth failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as OAuthTokenResponse;
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

    return this.accessToken;
  }
}
