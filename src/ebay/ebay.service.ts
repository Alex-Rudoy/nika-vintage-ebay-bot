import { Injectable, Logger } from '@nestjs/common';
import { EbaySearchParams } from './ebay-search-builder';

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
  private static readonly RETRY_DELAYS_MS = [5000, 15000, 45000];
  private static readonly MAX_RETRIES = 3;
  private accessToken?: string;
  private tokenExpiresAt = 0;

  private static readonly API_BASE = 'https://api.ebay.com';

  async search(params: EbaySearchParams): Promise<string[]> {
    const token = await this.getAccessToken();
    const query = new URLSearchParams();

    if (params.q) query.set('q', params.q);
    if (params.categoryIds) query.set('category_ids', params.categoryIds);
    if (params.sort) query.set('sort', params.sort);
    if (params.filters.length) query.set('filter', params.filters.join(','));
    query.set('limit', '50');

    const url = `${EbayService.API_BASE}/buy/browse/v1/item_summary/search?${query}`;

    this.logger.log(`eBay API search: ${url}`);

    for (let attempt = 0; attempt <= EbayService.MAX_RETRIES; attempt++) {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': params.marketplaceId,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = (await response.json()) as SearchResponse;
        const items = data.itemSummaries ?? [];

        this.logger.log(
          `eBay API returned ${items.length} items (total: ${data.total ?? 0})`,
        );

        return items
          .map((item) => item.itemWebUrl?.split('?')[0])
          .filter((url): url is string => Boolean(url));
      }

      const body = await response.text();
      const retryable = response.status === 429 || response.status >= 500;

      if (!retryable || attempt === EbayService.MAX_RETRIES) {
        this.logger.error(`eBay API error ${response.status}: ${body}`);
        return [];
      }

      const delayMs = this.getRetryDelayMs(attempt, response);
      this.logger.warn(
        `eBay API ${response.status}, retry ${attempt + 1}/${
          EbayService.MAX_RETRIES
        } in ${delayMs}ms`,
      );
      await this.sleep(delayMs);
    }

    return [];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getRetryDelayMs(attempt: number, response: Response): number {
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      if (retryAfter) {
        const seconds = Number(retryAfter);
        if (Number.isFinite(seconds)) {
          return seconds * 1000;
        }
      }
    }

    return EbayService.RETRY_DELAYS_MS[attempt] ?? 45000;
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

    const response = await fetch(
      `${EbayService.API_BASE}/identity/v1/oauth2/token`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'https://api.ebay.com/oauth/api_scope',
        }),
      },
    );

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
