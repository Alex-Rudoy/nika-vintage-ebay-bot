import { Logger } from '@nestjs/common';

export const DEFAULT_RETRY_DELAYS_MS = [5000, 15000, 45000];

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

export function getRetryDelayFromHeader(
  response: Response,
  attempt: number,
  delays: number[] = DEFAULT_RETRY_DELAYS_MS,
): number {
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (Number.isFinite(seconds)) {
        return seconds * 1000;
      }
    }
  }

  return delays[attempt] ?? delays[delays.length - 1];
}

export function parseTelegramRetryAfter(body: string): number | undefined {
  try {
    const parsed = JSON.parse(body) as {
      parameters?: { retry_after?: number };
    };
    const retryAfter = parsed.parameters?.retry_after;
    if (typeof retryAfter === 'number' && Number.isFinite(retryAfter)) {
      return retryAfter;
    }
  } catch {
    // ignore malformed response body
  }
  return undefined;
}

export interface FetchWithRetryResult {
  ok: boolean;
  status: number;
  body: string;
}

export interface FetchWithRetryOptions {
  maxRetries: number;
  retryDelaysMs?: number[];
  label: string;
  logger: Logger;
  getRetryDelayMs?: (ctx: {
    status: number;
    body: string;
    attempt: number;
    response: Response;
  }) => number;
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: FetchWithRetryOptions,
): Promise<FetchWithRetryResult> {
  const delays = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  let lastResult: FetchWithRetryResult = { ok: false, status: 0, body: '' };

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    const response = await fetch(url, init);
    const body = await response.text();

    if (response.ok) {
      return { ok: true, status: response.status, body };
    }

    lastResult = { ok: false, status: response.status, body };

    if (!isRetryableStatus(response.status) || attempt === options.maxRetries) {
      options.logger.error(
        `${options.label} failed (${response.status}): ${body}`,
      );
      return lastResult;
    }

    const delayMs =
      options.getRetryDelayMs?.({
        status: response.status,
        body,
        attempt,
        response,
      }) ?? getRetryDelayFromHeader(response, attempt, delays);

    options.logger.warn(
      `${options.label} ${response.status}, retry ${attempt + 1}/${
        options.maxRetries
      } in ${delayMs}ms`,
    );
    await sleep(delayMs);
  }

  return lastResult;
}

export class IntervalThrottler {
  private readonly lastAtByKey = new Map<number, number>();

  constructor(private readonly minIntervalMs: number) {}

  async wait(key: number): Promise<void> {
    const lastAt = this.lastAtByKey.get(key);
    if (lastAt === undefined) {
      return;
    }

    const elapsed = Date.now() - lastAt;
    const waitMs = this.minIntervalMs - elapsed;
    if (waitMs > 0) {
      await sleep(waitMs);
    }
  }

  mark(key: number): void {
    this.lastAtByKey.set(key, Date.now());
  }
}
