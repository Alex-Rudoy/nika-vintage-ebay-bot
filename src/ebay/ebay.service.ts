import { Injectable, Logger } from '@nestjs/common';
import {
  DEFAULT_RETRY_DELAYS_MS,
  fetchWithRetry,
  getRetryDelayFromHeader,
} from 'src/common/http-retry';
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

export interface EbaySearchResult {
  links: string[];
  error?: { status: number; body: string };
}

@Injectable()
export class EbayService {
  private readonly logger = new Logger(EbayService.name);
  private static readonly MAX_RETRIES = 3;
  private accessToken?: string;
  private tokenExpiresAt = 0;

  private static readonly API_BASE = 'https://api.ebay.com';

  async search(
    params: EbaySearchParams,
    context?: string,
  ): Promise<EbaySearchResult> {
    const token = await this.getAccessToken();
    const query = new URLSearchParams();

    if (params.q) query.set('q', params.q);
    if (params.categoryIds) query.set('category_ids', params.categoryIds);
    if (params.sort) query.set('sort', params.sort);
    if (params.filters.length) query.set('filter', params.filters.join(','));
    query.set('limit', '50');

    const url = `${EbayService.API_BASE}/buy/browse/v1/item_summary/search?${query}`;
    const label = context
      ? `eBay API search (${context})`
      : `eBay API search (${params.marketplaceId}, q=${params.q ?? ''})`;

    this.logger.log(`${label}: ${url}`);

    const result = await fetchWithRetry(
      url,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-EBAY-C-MARKETPLACE-ID': params.marketplaceId,
          'Content-Type': 'application/json',
        },
      },
      {
        maxRetries: EbayService.MAX_RETRIES,
        retryDelaysMs: DEFAULT_RETRY_DELAYS_MS,
        label,
        logger: this.logger,
        getRetryDelayMs: ({ attempt, response }) =>
          getRetryDelayFromHeader(response, attempt, DEFAULT_RETRY_DELAYS_MS),
      },
    );

    if (!result.ok) {
      return {
        links: [],
        error: { status: result.status, body: result.body },
      };
    }

    const data = JSON.parse(result.body) as SearchResponse;
    const items = data.itemSummaries ?? [];

    this.logger.log(
      `${label} returned ${items.length} items (total: ${data.total ?? 0})`,
    );

    const links = items
      .map((item) => item.itemWebUrl?.split('?')[0])
      .filter((itemUrl): itemUrl is string => Boolean(itemUrl));

    return { links };
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

    const result = await fetchWithRetry(
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
      {
        maxRetries: EbayService.MAX_RETRIES,
        retryDelaysMs: DEFAULT_RETRY_DELAYS_MS,
        label: 'eBay OAuth',
        logger: this.logger,
        getRetryDelayMs: ({ attempt, response }) =>
          getRetryDelayFromHeader(response, attempt, DEFAULT_RETRY_DELAYS_MS),
      },
    );

    if (!result.ok) {
      throw new Error(`eBay OAuth failed (${result.status}): ${result.body}`);
    }

    const data = JSON.parse(result.body) as OAuthTokenResponse;
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

    return this.accessToken;
  }
}
