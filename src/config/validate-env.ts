const REQUIRED_ENV_VARS = [
  'MONGO_URL',
  'TELEGRAM_TOKEN',
  'TELEGRAM_CHAT_IDS',
  'GOOGLE_SPREADSHEET_ID',
  'GOOGLE_SPREADSHEET_WORKSHEET_NAME',
  'GOOGLE_CLOUD_PRIVATE_KEY',
  'GOOGLE_CLOUD_CLIENT_EMAIL',
  'EBAY_CLIENT_ID',
  'EBAY_CLIENT_SECRET',
] as const;

function assertNonEmpty(name: string, value: unknown): void {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
}

function validateTelegramChatIds(raw: string): void {
  const ids = raw.split(',').map((id) => id.trim());
  if (ids.length === 0 || ids.some((id) => id === '')) {
    throw new Error(
      'TELEGRAM_CHAT_IDS must be a comma-separated list of numeric chat IDs',
    );
  }

  for (const id of ids) {
    const parsed = Number(id);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Invalid TELEGRAM_CHAT_IDS entry: ${id}`);
    }
  }
}

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  for (const name of REQUIRED_ENV_VARS) {
    assertNonEmpty(name, config[name]);
  }

  validateTelegramChatIds(String(config.TELEGRAM_CHAT_IDS));

  return config;
}
